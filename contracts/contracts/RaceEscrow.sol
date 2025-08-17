// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RaceEscrow is ReentrancyGuard {
    using ECDSA for bytes32;

    enum RaceState { Open, Closed, Resolved, Refunded }

    struct Race {
        uint256 stakeWei;
        uint256 joinDeadline; // block timestamp
        address organizer;
        address resultSigner; // backend signer address
        RaceState state;
        address winner;
        uint256 pool;
        mapping(address => bool) joined;
        address[] participants;
    }

    bytes32 private immutable DOMAIN_SEPARATOR;
    bytes32 private constant RESULT_TYPEHASH = keccak256(
        "RaceResult(uint256 raceId,address winner,uint256 nonce)"
    );

    uint256 public nonce; // simple replay protection for results
    uint256 public nextRaceId;
    mapping(uint256 => Race) private races;

    // Tracks ETH sent directly via receive/fallback to be claimed into a race later
    mapping(address => uint256) public pendingCredits;

    // Emitted when ETH is sent directly to the contract (no function call)
    event DirectDeposit(address indexed from, uint256 amount);
    // Emitted when fallback receives data (unknown function selector)
    event FallbackDeposit(address indexed from, uint256 amount, bytes data);
    // Emitted when a deposit is attributed to a specific race
    event Deposited(uint256 indexed raceId, address indexed from, uint256 amount);

    event RaceCreated(uint256 indexed raceId, uint256 stakeWei, uint256 joinDeadline, address organizer);
    event Joined(uint256 indexed raceId, address indexed runner);
    event Closed(uint256 indexed raceId);
    event Resolved(uint256 indexed raceId, address indexed winner, uint256 amount);
    event Refunded(uint256 indexed raceId);

    constructor(string memory name, string memory version) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes(name)),
            keccak256(bytes(version)),
            chainId,
            address(this)
        ));
    }

    function createRace(uint256 stakeWei, uint256 joinWindowSeconds, address resultSigner) external returns (uint256 raceId) {
        require(stakeWei > 0, "stake=0");
        require(resultSigner != address(0), "signer=0");

        raceId = nextRaceId++;
        Race storage r = races[raceId];
        r.stakeWei = stakeWei;
        r.joinDeadline = block.timestamp + joinWindowSeconds;
        r.organizer = msg.sender;
        r.resultSigner = resultSigner;
        r.state = RaceState.Open;

        emit RaceCreated(raceId, stakeWei, r.joinDeadline, msg.sender);
    }

    function getRace(uint256 raceId) external view returns (
        uint256 stakeWei,
        uint256 joinDeadline,
        address organizer,
        address resultSigner,
        RaceState state,
        address winner,
        uint256 pool,
        uint256 participantCount
    ) {
        Race storage r = races[raceId];
        return (r.stakeWei, r.joinDeadline, r.organizer, r.resultSigner, r.state, r.winner, r.pool, r.participants.length);
    }

    function hasJoined(uint256 raceId, address user) external view returns (bool) {
        return races[raceId].joined[user];
    }

    function participantsOf(uint256 raceId) external view returns (address[] memory) {
        return races[raceId].participants;
    }

    function joinRace(uint256 raceId) external payable nonReentrant {
        _joinWithValue(raceId, msg.sender, msg.value);
    }

    function closeJoin(uint256 raceId) external {
        Race storage r = races[raceId];
        require(r.state == RaceState.Open, "not open");
        require(block.timestamp > r.joinDeadline, "still joinable");
        r.state = RaceState.Closed;
        emit Closed(raceId);
    }

    function submitResult(uint256 raceId, address winner, bytes calldata signature) external nonReentrant {
        Race storage r = races[raceId];
        require(r.state == RaceState.Closed, "not closed");
        require(r.joined[winner], "winner not participant");

        bytes32 structHash = keccak256(abi.encode(RESULT_TYPEHASH, raceId, winner, nonce));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address recovered = ECDSA.recover(digest, signature);
        require(recovered == r.resultSigner, "bad signature");

        uint256 amount = r.pool;
        r.pool = 0;
        r.state = RaceState.Resolved;
        r.winner = winner;
        nonce++;

        (bool ok, ) = winner.call{value: amount}("");
        require(ok, "transfer failed");

        emit Resolved(raceId, winner, amount);
    }

    function refundAll(uint256 raceId) external nonReentrant {
        Race storage r = races[raceId];
        require(r.state == RaceState.Closed || r.state == RaceState.Open, "not refundable");
        require(msg.sender == r.organizer, "not organizer");

        r.state = RaceState.Refunded;
        uint256 n = r.participants.length;
        uint256 stake = r.stakeWei;

        for (uint256 i = 0; i < n; i++) {
            address p = r.participants[i];
            if (r.joined[p]) {
                r.joined[p] = false;
                (bool ok, ) = p.call{value: stake}("");
                require(ok, "refund failed");
                r.pool -= stake;
            }
        }

        emit Refunded(raceId);
    }

    // Payable function to deposit for a specific race ID (simple wallets can call this)
    function depositToRace(uint256 raceId) external payable nonReentrant {
        _joinWithValue(raceId, msg.sender, msg.value);
    }

    // Accepts plain ETH transfers (no calldata). Does not attribute to any race.
    receive() external payable {
        pendingCredits[msg.sender] += msg.value;
        emit DirectDeposit(msg.sender, msg.value);
    }

    // Accepts ETH when calldata doesn't match any function. If msg.data is a
    // single uint256 (ABI-encoded raceId), attribute the deposit to that race.
    fallback() external payable {
        if (msg.data.length == 32) {
            uint256 raceId = abi.decode(msg.data, (uint256));
            _joinWithValue(raceId, msg.sender, msg.value);
            return;
        }
        // Unknown calldata: credit to sender for later claiming
        pendingCredits[msg.sender] += msg.value;
        emit FallbackDeposit(msg.sender, msg.value, msg.data);
    }

    // Claim previously credited ETH into a specific race (no additional ETH needed)
    function claimToRace(uint256 raceId) external nonReentrant {
        Race storage r = races[raceId];
        require(r.state == RaceState.Open, "not open");
        require(block.timestamp <= r.joinDeadline, "join closed");
        uint256 stake = r.stakeWei;
        require(pendingCredits[msg.sender] >= stake, "insufficient credit");
        require(!r.joined[msg.sender], "already joined");

        pendingCredits[msg.sender] -= stake;
        _joinWithValue(raceId, msg.sender, stake);
    }

    // Anyone can trigger a claim for a user if the user has sufficient pending credits.
    function claimToRaceFor(address user, uint256 raceId) external nonReentrant {
        Race storage r = races[raceId];
        require(r.state == RaceState.Open, "not open");
        require(block.timestamp <= r.joinDeadline, "join closed");
        uint256 stake = r.stakeWei;
        require(pendingCredits[user] >= stake, "insufficient credit");
        require(!r.joined[user], "already joined");

        pendingCredits[user] -= stake;
        _joinWithValue(raceId, user, stake);
    }

    // Internal helper to perform join/deposit logic with value attribution
    function _joinWithValue(uint256 raceId, address sender, uint256 amount) private {
        Race storage r = races[raceId];
        require(r.state == RaceState.Open, "not open");
        require(block.timestamp <= r.joinDeadline, "join closed");
        require(amount == r.stakeWei, "wrong stake");
        require(!r.joined[sender], "already joined");

        r.joined[sender] = true;
        r.participants.push(sender);
        r.pool += amount;

        emit Joined(raceId, sender);
        emit Deposited(raceId, sender, amount);
    }
}
