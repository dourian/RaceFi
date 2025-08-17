import { Link, useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Text,
  StyleSheet,
  Pressable,
  View,
  ScrollView,
  Image,
  Dimensions,
  Alert,
} from "react-native";
import { ActivityIndicator } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ApiService } from "../../services/apiService";
import { EscrowService } from "../../services/escrowService";
import { ONRAMP_CONFIG, TOKEN_API_URL } from "../../app/config";
import { Challenge } from "../../constants/types";
import { colors, spacing, typography, shadows, borderRadius } from "../theme";
import {
  Card,
  CardHeader,
  CardContent,
  Stat,
  Avatar,
  Badge,
  Progress,
  Separator,
} from "../../components/ui";
import { useState, useEffect } from "react";
import { useChallenge } from "../../contexts/challengeContext";
import { ChallengeService } from "../../services/challengeService";
import { RunCalculationService } from "../../services/runCalculationService";
import LeaderboardService from "../../services/leaderboardService";
import StaticRoutePreview from "../../components/StaticRoutePreview";
import { useAppTime, getCurrentAppTime } from "../../helpers/timeManager";
import { getStoredWalletAddress } from "../../helpers/walletStorage";

export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<
    string | number | null
  >(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getChallengeStatus, joinChallenge, startChallengeRun } =
    useChallenge();
  const currentAppTime = useAppTime(); // Use centralized app time that updates when time changes

  // Load challenge data from API
  useEffect(() => {
    const loadChallenge = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);
        const challengeData = await ApiService.getChallengeById(id);
        setChallenge(challengeData || null);
      } catch (err) {
        console.error("Error loading challenge:", err);
        setError("Failed to load challenge");
      } finally {
        setLoading(false);
      }
    };

    loadChallenge();
  }, [id]);

  // Load current user profile id and perform an initial on-chain join check
  useEffect(() => {
    const loadMe = async () => {
      try {
        const me: any = await ApiService.getCurrentUserProfile();
        if (me?.id != null) setCurrentProfileId(me.id as any);
        if (me) setCurrentProfile(me);
        // fallback: if profile has no wallet, hydrate from local storage
        try {
          if (!me?.wallet_address) {
            const local = await getStoredWalletAddress();
            if (local)
              setCurrentProfile((prev: any) => ({
                ...(prev || {}),
                wallet_address: local,
              }));
          }
        } catch {}
      } catch {}
    };
    loadMe();
  }, []);

  // On mount and when profile/challenge changes, check on-chain hasJoined
  useEffect(() => {
    (async () => {
      try {
        if (!id || !challenge) return;
        const addr = String(
          (currentProfile?.wallet_address as string) || "",
        ).trim();
        if (!addr) {
          setHasOnchainJoined(false);
          return;
        }
        // Get raceId via join-calldata (no wallet open), then query hasJoined
        const joinData = await EscrowService.getJoinCalldataByChallengeId(
          Number(id),
        );
        // Store latest join info for UI copy helpers
        try {
          setLastJoinInfo({
            to: (joinData as any)?.to,
            valueWei: (joinData as any)?.value
              ? String(BigInt((joinData as any).value))
              : undefined,
            raceId: (joinData as any)?.raceId,
          });
        } catch {}
        const base = (TOKEN_API_URL || "").replace(/\/$/, "");
        const raceId = (joinData as any)?.raceId as number | undefined;
        if (!base || raceId == null) return;
        const res = await fetch(`${base}/escrow/hasJoined/${raceId}/${addr}`);
        if (res.ok) {
          const j = await res.json();
          setHasOnchainJoined(!!j?.joined);
        } else {
          setHasOnchainJoined(false);
        }
      } catch {
        setHasOnchainJoined(false);
      }
    })();
  }, [id, challenge?.id, currentProfile?.wallet_address]);

  // Auto-claim pending credits into the race the user is viewing on refresh
  useEffect(() => {
    (async () => {
      try {
        if (!id || !challenge) return;
        const addr = String((currentProfile?.wallet_address as string) || "").trim();
        if (!addr) return;

        // Get raceId for this challenge
        const joinData = await EscrowService.getJoinCalldataByChallengeId(Number(id));
        const raceId = (joinData as any)?.raceId as number | undefined;
        if (raceId == null) return;

        // Check if already joined first
        const base = (TOKEN_API_URL || "").replace(/\/$/, "");
        const res = await fetch(`${base}/escrow/hasJoined/${raceId}/${addr}`);
        if (res.ok) {
          const j = await res.json();
          if (!!j?.joined) return; // nothing to do
        }

        if (autoClaiming) return; // avoid repeat
        setAutoClaiming(true);

        // If we have a remembered txHash for this join attempt, try backend ingestion
        if (lastJoinInfo?.txHash) {
          try {
            await fetch(`${base}/escrow/ingest-tx`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ txHash: lastJoinInfo.txHash, challengeId: Number(id) }),
            });
          } catch {}
        }

        // Build claim calldata and open wallet (value=0)
        try {
          const selector = "0x68d9f3a2"; // claimToRace(uint256)
          const raceHex = BigInt(raceId).toString(16).padStart(64, "0");
          const data = `${selector}${raceHex}`;
          const to = "0x9d000e23c55f79142C29476c6313763476d4f7A0";
          const link = `https://go.cb-w.com/ethereum?to=${to}&value=0&data=${data}&chainId=84532`;
          const can = await Linking.canOpenURL(link);
          if (can) await Linking.openURL(link);
        } catch {}

        // Poll for on-chain Joined and then sync Supabase like the join flow does
        try {
          const deadline = Date.now() + 60000; // up to 60s
          let found: string | null = null;
          while (Date.now() < deadline) {
            try {
              const r = await fetch(`${base}/escrow/find-join/${raceId}/${addr}`);
              if (r.ok) {
                const j = await r.json();
                if (j?.txHash) { found = String(j.txHash); break; }
              }
            } catch {}
            await new Promise((res) => setTimeout(res, 5000));
          }
          if (found) {
            try {
              const attendee = await ApiService.joinChallengeAsCurrentUser(Number(id), challenge!.stake);
              try {
                await ApiService.updateParticipant(attendee.id as number, {
                  stake_tx_hash: found,
                  onchain_joined: true,
                } as any);
              } catch {}
              setStakeTxHash(found);
              setHasOnchainJoined(true);
              // Mark joined locally and refresh challenge data
              try {
                joinChallenge(id);
                const refreshed = await ApiService.getChallengeById(id);
                if (refreshed) setChallenge(refreshed);
              } catch {}
            } catch {}
          }
        } catch {}
      } finally {
        setAutoClaiming(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, challenge?.id, currentProfile?.wallet_address]);

  const challengeStatus = getChallengeStatus(id || "");
  const isJoined = challengeStatus.status !== "not-joined";
  const isCompleted = challengeStatus.status === "completed";
  const isWinner = challengeStatus.status === "winner";
  const isCashedOut = challengeStatus.status === "cashOut";
  const isInProgress = challengeStatus.status === "in-progress";
  // Creator can join like everyone else; no special disable logic

  // Calculate actual time remaining using challenge end date and current app time
  const getTimeRemaining = () => {
    if (!challenge) return { timeLeft: 0, isExpired: true, progressValue: 0 };

    const now = currentAppTime;
    const endTime = challenge.endDate.getTime();
    const startTime = challenge.startDate.getTime();
    const timeLeft = Math.max(0, endTime - now);
    const isExpired = endTime < now;

    // Calculate progress as percentage of time elapsed
    const totalDuration = endTime - startTime;
    const elapsed = now - startTime;
    const progressValue = Math.min(
      100,
      Math.max(0, (elapsed / totalDuration) * 100),
    );

    return { timeLeft, isExpired, progressValue };
  };

  const formatTime = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Get expiry status and text using same logic as home screen
  const getExpiryInfo = (challenge: any, challengeStatus: any) => {
    const now = currentAppTime;
    const endTime = challenge.endDate.getTime();
    const timeDiff = endTime - now;

    // If user has completed the challenge (won, completed, or cashed out), show completed status
    if (challengeStatus.status === "winner") {
      return { text: "Challenge won!", color: "#DAA520", urgent: false };
    } else if (challengeStatus.status === "cashOut") {
      return { text: "Winnings cashed out", color: "#22c55e", urgent: false };
    } else if (challengeStatus.status === "completed") {
      return { text: "Challenge completed", color: "#22c55e", urgent: false };
    } else if (challengeStatus.status === "in-progress") {
      return { text: "Currently running", color: "#f59e0b", urgent: false };
    }

    // For non-participated or joined challenges, show time-based info
    if (timeDiff < 0) {
      return { text: "Expired", color: "#6b7280", urgent: false };
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    // Running window is the last 7 days before deadline
    const isInRunningWindow = days <= 7;

    if (days > 7) {
      // Still in sign-up only period
      const runningStartDays = days - 7;
      return {
        text: `Running starts in ${runningStartDays} days`,
        color: "#6b7280",
        urgent: false,
      };
    } else if (days > 1) {
      // In running window
      return {
        text: `${days} days to run`,
        color: "#22c55e",
        urgent: false,
      };
    } else if (days === 1) {
      return {
        text: `Final day to run`,
        color: "#f59e0b",
        urgent: true,
      };
    } else if (hours > 1) {
      return {
        text: `${hours}h to run`,
        color: "#ef4444",
        urgent: true,
      };
    } else {
      return {
        text: `${minutes}m to run`,
        color: "#ef4444",
        urgent: true,
      };
    }
  };

  // Check if challenge is expired
  const isExpired = challenge
    ? challenge.endDate.getTime() < currentAppTime
    : false;

  const [joining, setJoining] = useState(false);
  const [stakingState, setStakingState] = useState<
    "idle" | "awaiting_wallet" | "awaiting_chain" | "confirmed"
  >("idle");
  const [stakeTxHash, setStakeTxHash] = useState<string | null>(null);
  const [hasOnchainJoined, setHasOnchainJoined] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [consumeLoading, setConsumeLoading] = useState(false);
  const [lastJoinInfo, setLastJoinInfo] = useState<{
    to?: string;
    valueWei?: string;
    raceId?: number;
    txHash?: string;
  } | null>(null);
  const [autoClaiming, setAutoClaiming] = useState(false);

  const handleJoinChallenge = async () => {
    if (isExpired) {
      Alert.alert(
        "Challenge Expired",
        "This challenge has ended and no longer accepts new participants.",
        [{ text: "OK" }],
      );
      return;
    }

    if (!id || !challenge || joining) return;

    if (challenge.participants >= challenge.maxParticipants) {
      Alert.alert(
        "Challenge Full",
        "This challenge has reached the maximum number of participants.",
      );
      return;
    }

    try {
      setJoining(true);

      // Require a wallet on profile for staking
      const addr = String(
        (currentProfile?.wallet_address as string) || "",
      ).trim();
      if (!addr) {
        Alert.alert(
          "Wallet required",
          "Please add a wallet address to your profile before staking.",
        );
        return;
      }

      // 1) Get on-chain calldata first
      const joinData = await EscrowService.getJoinCalldataByChallengeId(
        Number(id),
      );
      if (joinData.value === "0x0" || joinData.value === "0x") {
        Alert.alert(
          "On-chain race not ready",
          "The on-chain race is not configured yet. Please try again later.",
        );
        return;
      }

      // 2) Try to open a wallet link; abort if we cannot
      let openedWallet = false;
      setStakingState("awaiting_wallet");
      // Log deeplinks for debugging
      try {
        console.log("[join] coinbaseWalletUrl:", joinData.coinbaseWalletUrl);
        console.log("[join] eip681:", joinData.eip681);
      } catch {}
      if (joinData.coinbaseWalletUrl) {
        const canOpenCbw = await Linking.canOpenURL(joinData.coinbaseWalletUrl);
        if (canOpenCbw) {
          await Linking.openURL(joinData.coinbaseWalletUrl);
          openedWallet = true;
        }
      }
      if (!openedWallet && joinData.eip681) {
        const canOpen681 = await Linking.canOpenURL(joinData.eip681);
        if (canOpen681) {
          await Linking.openURL(joinData.eip681);
          openedWallet = true;
        }
      }
      if (!openedWallet) {
        Alert.alert(
          "Wallet not available",
          `We couldn't open your wallet to complete staking.\nCoinbase URL: ${joinData.coinbaseWalletUrl || "(none)"}\nEIP-681: ${joinData.eip681 || "(none)"}`,
        );
        return;
      }

      // 3) After handing off to wallet, wait for on-chain confirmation; do NOT create attendee yet
      setStakingState("awaiting_chain");

      // 4) Background: try to capture the on-chain tx hash if we have a user address configured
      (async () => {
        try {
          const addr = String(
            (currentProfile?.wallet_address as string) || "",
          ).trim();
          const base = (TOKEN_API_URL || "").replace(/\/$/, "");
          const rId = (joinData as any)?.raceId as number | undefined;
          if (!addr || !base || !rId) return;
          const deadline = Date.now() + 60000; // up to 60s
          let found: string | null = null;
          while (Date.now() < deadline) {
            try {
              const res = await fetch(
                `${base}/escrow/find-join/${rId}/${addr}`,
              );
              if (res.ok) {
                const j = await res.json();
                if (j?.txHash) {
                  found = String(j.txHash);
                  break;
                }
              }
            } catch {}
            await new Promise((res) => setTimeout(res, 5000));
          }
          if (found) {
            try {
              // Create attendee now that on-chain join is confirmed
              const attendee = await ApiService.joinChallengeAsCurrentUser(
                Number(id),
                challenge!.stake,
              );
              try {
                await ApiService.updateParticipant(
                  attendee.id as number,
                  {
                    stake_tx_hash: found,
                    onchain_joined: true,
                  } as any,
                );
              } catch {}
              setStakeTxHash(found);
              setStakingState("confirmed");
              setHasOnchainJoined(true);
              // Now mark joined locally and refresh the challenge data
              try {
                joinChallenge(id);
                const refreshed = await ApiService.getChallengeById(id);
                if (refreshed) setChallenge(refreshed);
              } catch {}
            } catch (e) {
              console.warn(
                "Failed to persist attendee after on-chain join:",
                (e as any)?.message || String(e),
              );
            }
          }
        } catch (e) {
          console.warn(
            "join tx poll skipped:",
            (e as any)?.message || String(e),
          );
        }
      })();

      // Inform user to proceed in wallet; we'll only mark joined after on-chain confirmation
      Alert.alert(
        "Proceed in your wallet",
        "Approve the transaction in your wallet to complete on-chain staking. Recording will be enabled once confirmed.",
      );
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("duplicate")
      ) {
        // Treat as already joined
        joinChallenge(id);
        const refreshed = await ApiService.getChallengeById(id);
        if (refreshed) setChallenge(refreshed);
        Alert.alert("Already joined", "You are already a participant.");
      } else {
        console.error("Join failed", e);
        Alert.alert("Join failed", msg || "Unable to join challenge");
      }
    } finally {
      setJoining(false);
    }
  };

  async function handleRefreshOnchain() {
    if (refreshLoading) return;
    setRefreshLoading(true);
    try {
      if (!id || !challenge) return;
      const addr = String(
        (currentProfile?.wallet_address as string) || "",
      ).trim();
      if (!addr) {
        Alert.alert("Wallet required", "Add a wallet on your profile first.");
        return;
      }
      const joinData = await EscrowService.getJoinCalldataByChallengeId(
        Number(id),
      );
      const base = (TOKEN_API_URL || "").replace(/\/$/, "");
      const rId = (joinData as any)?.raceId as number | undefined;
      if (!base || !rId) return;

      // Try to find tx hash first
      let found: string | null = null;
      try {
        const res = await fetch(`${base}/escrow/find-join/${rId}/${addr}`);
        if (res.ok) {
          const j = await res.json();
          if (j?.txHash) found = String(j.txHash);
        }
      } catch {}

      if (found) {
        // Persist attendee and mark joined
        try {
          const attendee = await ApiService.joinChallengeAsCurrentUser(
            Number(id),
            challenge.stake,
          );
          try {
            await ApiService.updateParticipant(
              attendee.id as number,
              {
                stake_tx_hash: found,
                onchain_joined: true,
              } as any,
            );
          } catch {}
          setStakeTxHash(found);
          setHasOnchainJoined(true);
          setStakingState("confirmed");
          joinChallenge(id);
          const refreshed = await ApiService.getChallengeById(id);
          if (refreshed) setChallenge(refreshed);
          Alert.alert("Confirmed", "On-chain stake detected and saved.");
          return;
        } catch (e) {
          console.warn(
            "refresh persist attendee failed:",
            (e as any)?.message || String(e),
          );
        }
      }

      // Fallback: hasJoined flag
      const hj = await fetch(`${base}/escrow/hasJoined/${rId}/${addr}`);
      if (hj.ok) {
        const j = await hj.json();
        if (j?.joined) {
          setHasOnchainJoined(true);
          // Persist attendee with joined flag if not present
          try {
            const attendee = await ApiService.joinChallengeAsCurrentUser(
              Number(id),
              challenge.stake,
            );
            try {
              await ApiService.updateParticipant(
                attendee.id as number,
                {
                  onchain_joined: true,
                } as any,
              );
            } catch {}
          } catch {}
          Alert.alert("Confirmed", "On-chain join detected.");
          return;
        }
      }

      Alert.alert(
        "Not found",
        "No on-chain stake detected yet. Try again in a few seconds.",
      );
    } catch (e) {
      Alert.alert(
        "Error",
        (e as any)?.message || "Failed to refresh on-chain status",
      );
    } finally {
      setRefreshLoading(false);
    }
  }

  // Explicit user-triggered consume credits
  async function handleConsumeCredits() {
    if (consumeLoading) return;
    setConsumeLoading(true);
    try {
      console.log("[consumeCredits] start", { challengeId: id });
      if (!id || !challenge) {
        console.log("[consumeCredits] missing id or challenge", { id, hasChallenge: !!challenge });
        return;
      }
      const addr = String((currentProfile?.wallet_address as string) || "").trim();
      console.log("[consumeCredits] wallet addr", addr);
      if (!addr) {
        Alert.alert("Wallet required", "Add a wallet on your profile first.");
        return;
      }
      const base = (TOKEN_API_URL || "").replace(/\/$/, "");
      console.log("[consumeCredits] base", { base, tokenApiUrl: TOKEN_API_URL });
      if (!base) {
        console.log("[consumeCredits] abort: missing base TOKEN_API_URL");
        return;
      }
      let rId: number | undefined = undefined;
      let immediateTxHash: string | null = null;

      // First try API-only consume via backend operator
      let needWalletClaim = true;
      let backendTried = true;
      try {
        const url = `${base}/escrow/consume-credits`;
        const payload = { user: addr, challengeId: Number(id) } as const;
        console.log("[consumeCredits] POST", url, payload);
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        console.log("[consumeCredits] resp status", resp.status);
        if (resp.ok) {
          const j = await resp.json();
          console.log("[consumeCredits] resp json", j);
          if (j?.joined) {
            needWalletClaim = false;
            // Capture raceId from backend if provided (allow 0)
            if (typeof j.raceId === "number") {
              rId = j.raceId as number;
            }
            // Capture tx hash if provided to skip polling
            if (typeof j.claimTxHash === "string") {
              immediateTxHash = j.claimTxHash;
            } else if (typeof j.txHash === "string") {
              immediateTxHash = j.txHash;
            }
            Alert.alert("Credits attributed", "Your previous transfer was matched to this race. Waiting for confirmation…");
          } else if (j?.action === "call_claimToRace") {
            needWalletClaim = true;
          } else {
            needWalletClaim = true;
          }
        } else {
          const txt = await resp.text().catch(() => "");
          console.log("[consumeCredits] resp not ok", { status: resp.status, body: txt });
          Alert.alert("Consume API failed", `Status ${resp.status}. Will try alternate attribution. ${txt?.slice(0,120) || ""}`);
        }
      } catch (e) {
        backendTried = true;
        console.log("[consumeCredits] consume-credits error", e);
        Alert.alert("Consume API error", "Trying alternate attribution.");
      }

      // If still not joined, try ingestion by txHash (if provided)
      if (needWalletClaim && lastJoinInfo?.txHash) {
        try {
          const url = `${base}/escrow/ingest-tx`;
          const payload = { txHash: lastJoinInfo.txHash, challengeId: Number(id) } as const;
          console.log("[consumeCredits] POST", url, payload);
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          backendTried = true;
          console.log("[consumeCredits] ingest resp status", resp.status);
          if (resp.ok) {
            const j = await resp.json();
            console.log("[consumeCredits] ingest resp json", j);
            if (j?.joined) {
              needWalletClaim = false;
              Alert.alert("Credits attributed", "Your previous transfer was matched to this race. Waiting for confirmation…");
            } else if (j?.action === "call_claimToRace") {
              needWalletClaim = true;
            } else {
              needWalletClaim = true;
            }
          } else {
            const txt = await resp.text().catch(() => "");
            console.log("[consumeCredits] ingest not ok", { status: resp.status, body: txt });
            Alert.alert("Ingest API failed", `Status ${resp.status}. Will try wallet claim. ${txt?.slice(0,120) || ""}`);
          }
        } catch (e) {
          backendTried = true;
          console.log("[consumeCredits] ingest error", e);
          Alert.alert("Ingest error", "Falling back to wallet claim.");
        }
      } else if (needWalletClaim) {
        console.log("[consumeCredits] skipping ingest: no txHash available");
      }

      // If still need wallet claim, open wallet with claim calldata (value 0)
      if (needWalletClaim) {
        try {
          // Lazy-load raceId only when building wallet claim fallback
          if (rId == null) {
            console.log("[consumeCredits] fetching join calldata for wallet fallback");
            const joinData2 = await EscrowService.getJoinCalldataByChallengeId(Number(id));
            rId = (joinData2 as any)?.raceId as number | undefined;
            console.log("[consumeCredits] fetched rId", rId);
          }
          if (rId == null) {
            Alert.alert("Claim not available", "Race ID is not ready yet. Please try again shortly.");
            return;
          }
          const selector = "0x68d9f3a2";
          const raceHex = BigInt(rId).toString(16).padStart(64, "0");
          const data = `${selector}${raceHex}`;
          const to = "0x9d000e23c55f79142C29476c6313763476d4f7A0";
          const link = `https://go.cb-w.com/ethereum?to=${to}\u0026value=0\u0026data=${data}\u0026chainId=84532`;
          console.log("[consumeCredits] opening wallet link", link);
          // Try opening without canOpenURL to avoid false negatives
          let opened = false;
          try {
            await Linking.openURL(link);
            opened = true;
          } catch (errOpen) {
            console.log("[consumeCredits] openURL failed, trying canOpenURL", errOpen);
            try {
              const can = await Linking.canOpenURL(link);
              console.log("[consumeCredits] canOpenURL:", can);
              if (can) {
                await Linking.openURL(link);
                opened = true;
              }
            } catch (errCan) {
              console.log("[consumeCredits] canOpenURL error", errCan);
            }
          }
          if (!opened) {
            Alert.alert(
              "Open your wallet",
              `We couldn't open your wallet automatically. Use these details to claim manually:\nTo: ${to}\nData: ${data}\nValue: 0\nChain: Base Sepolia (84532)`,
            );
          } else {
            Alert.alert("Wallet opened", "Approve the 0-value claim transaction to consume your credits.");
          }
        } catch (e) {
          console.log("[consumeCredits] wallet link unexpected error", e);
          Alert.alert("Wallet link failed", "Please try again or copy the claim details manually.");
        }
      }

      // Poll for Joined and then persist to Supabase
      try {
        const deadline = Date.now() + 60000;
        let found: string | null = immediateTxHash || null;
        let iter = 0;
        // If we don't already have a tx hash from backend, poll by raceId if available
        while (!found && rId != null && Date.now() < deadline) {
          iter++;
          try {
            const url = `${base}/escrow/find-join/${rId}/${addr}`;
            console.log("[consumeCredits] poll find-join", { iter, url });
            const r = await fetch(url);
            console.log("[consumeCredits] poll status", r.status);
            if (r.ok) {
              const j = await r.json();
              console.log("[consumeCredits] poll json", j);
              if (j?.txHash) { found = String(j.txHash); break; }
            }
          } catch (errPoll) {
            console.log("[consumeCredits] poll error", errPoll);
          }
          await new Promise((res) => setTimeout(res, 5000));
        }
        if (found) {
          console.log("[consumeCredits] join detected txHash", found);
          try {
            const attendee = await ApiService.joinChallengeAsCurrentUser(Number(id), challenge.stake);
            try { await ApiService.updateParticipant(attendee.id as number, { stake_tx_hash: found, onchain_joined: true } as any); } catch {}
            setStakeTxHash(found);
            setHasOnchainJoined(true);
            joinChallenge(id);
            const refreshed = await ApiService.getChallengeById(id);
            if (refreshed) setChallenge(refreshed);
            Alert.alert("Credits consumed", "Your pending deposit has been applied to this race.");
            return;
          } catch (e) {
            console.log("[consumeCredits] persisted join failed", e);
            Alert.alert("Saved on-chain, but app update failed", "We detected the join on-chain, but updating your profile failed. Pull to refresh.");
          }
        } else {
          console.log("[consumeCredits] no join detected after polling");
          if (backendTried && !needWalletClaim) {
            Alert.alert("Attribution in progress", "Please wait a few seconds and refresh on-chain status.");
          } else {
            Alert.alert("No on-chain join found yet", "If you approved in wallet, please wait and press Refresh on-chain status.");
          }
        }
      } catch (e) {
        console.log("[consumeCredits] polling error", e);
        Alert.alert("Error", (e as any)?.message || "Failed to consume credits");
      }
    } finally {
      setConsumeLoading(false);
      console.log("[consumeCredits] end");
    }
  }

  const handleStartRecording = () => {
    // Gate recording strictly on on-chain hasJoined
    if (!hasOnchainJoined) {
      Alert.alert(
        "Stake required",
        "You must complete the on-chain stake from your profile wallet before recording.",
      );
      return;
    }
    if (id) {
      startChallengeRun(id);
    }
  };

  // Handle loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading challenge...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle error state
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              const loadChallenge = async () => {
                if (!id) return;

                try {
                  setLoading(true);
                  setError(null);
                  const challengeData = await ApiService.getChallengeById(id);
                  setChallenge(challengeData || null);
                } catch (err) {
                  console.error("Error loading challenge:", err);
                  setError("Failed to load challenge");
                } finally {
                  setLoading(false);
                }
              };
              loadChallenge();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Handle challenge not found
  if (!challenge) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Challenge not found.</Text>
          <Link href="/(tabs)" asChild>
            <Pressable style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Back to Challenges</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  // Generate leaderboard data using the service
  const leaderboardData = LeaderboardService.generateLeaderboard(
    challenge,
    challengeStatus,
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView style={styles.scrollView}>
        {/* Orange Header Banner */}
        <View style={styles.headerBanner}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.locationText}>{challenge.location}</Text>
          </View>
          <Text style={styles.headerTitle}>{challenge.name}</Text>
          <Text style={styles.headerDescription}>{challenge.description}</Text>
        </View>

        {/* Runner Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require("../../assets/rwcover.webp")}
            style={styles.runnerImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.mainContent}>
          {/* Challenge Stats */}
          <Card>
            <CardHeader
              title="Challenge Details"
              icon={
                <Ionicons name="flash" size={18} color={colors.accentStrong} />
              }
            />
            <CardContent>
              <View style={styles.statsGrid}>
                <Stat label="Distance" value={`${challenge.distanceKm}km`} />
                <Stat label="Elevation" value={`${challenge.elevation}m`} />
                <Stat
                  label="Prize Pool"
                  value={`${challenge.prizePool} USDC`}
                />
              </View>
            </CardContent>
          </Card>

          {/* Route Map - Only show for non-completed challenges */}
          {!isCompleted && !isWinner && !isCashedOut && (
            <Card style={styles.cardSpacing}>
              <CardHeader title="Route Map" />
              <CardContent>
                <View style={styles.mapContainer}>
                  {challenge.polyline ? (
                    <StaticRoutePreview
                      challengeId={challenge.id}
                      polyline={challenge.polyline}
                      routeColor={challenge.routeColor}
                      width={Dimensions.get("window").width - 80}
                      height={200}
                      style={styles.routeMap}
                    />
                  ) : (
                    <View style={styles.mapPlaceholder}>
                      <Ionicons name="map" size={48} color={colors.textMuted} />
                      <Text style={styles.mapText}>Route map coming soon</Text>
                      <Text style={styles.mapSubtext}>
                        Showing {challenge.distanceKm}km route through{" "}
                        {challenge.location.split(",")[0]}
                      </Text>
                    </View>
                  )}
                </View>
              </CardContent>
            </Card>
          )}

          {/* Challenge Status Card */}
          {!isJoined ? (
            isExpired ? (
              <Card style={{ ...styles.cardSpacing, ...styles.expiredCard }}>
                <CardHeader
                  title="Challenge Expired"
                  icon={<Ionicons name="time" size={18} color="#6b7280" />}
                />
                <CardContent>
                  <Text style={styles.expiredText}>
                    This challenge has ended and no longer accepts new
                    participants.
                  </Text>
                  <View style={styles.expiredStakeInfo}>
                    <Text style={styles.expiredStakeAmount}>
                      {challenge.stake} USDC
                    </Text>
                    <Text style={styles.expiredStakeLabel}>
                      Entry fee (no longer available)
                    </Text>
                  </View>
                  <Text style={styles.expiredNote}>
                    Check out our other upcoming challenges to join the action!
                  </Text>
                </CardContent>
              </Card>
            ) : (
              <Card style={{ ...styles.cardSpacing, ...styles.joinCard }}>
                <CardHeader title="Join Challenge" />
                <CardContent>
                  <View style={styles.stakeInfo}>
                    <Text style={styles.stakeAmount}>
                      {challenge.stake} USDC
                    </Text>
                    <Text style={styles.stakeLabel}>Stake to join</Text>
                  </View>
                  <Pressable
                    onPress={handleJoinChallenge}
                    disabled={
                      joining ||
                      !currentProfile?.wallet_address ||
                      challenge.participants >= challenge.maxParticipants
                    }
                    style={[
                      styles.joinButton,
                      joining ||
                      challenge.participants >= challenge.maxParticipants
                        ? { opacity: 0.7 }
                        : null,
                    ]}
                  >
                    <Text style={styles.joinButtonText}>
                      {challenge.participants >= challenge.maxParticipants
                        ? "Challenge Full"
                        : joining
                          ? "Joining..."
                          : "Stake & Join Challenge"}
                    </Text>
                  </Pressable>
                  <Text style={styles.stakeDisclaimer}>
                    Winner takes all! Complete the challenge with the best time
                    to win the entire prize pool.
                  </Text>
                  {!currentProfile?.wallet_address && (
                    <Text style={styles.awaitingText}>
                      Add a wallet to your profile to stake and join.
                    </Text>
                  )}
                  {stakingState !== "idle" && (
                    <View style={{ marginTop: 8 }}>
                      {stakingState === "awaiting_wallet" && (
                        <Text style={styles.awaitingText}>Opening wallet…</Text>
                      )}
                      {stakingState === "awaiting_chain" && (
                        <Text style={styles.awaitingText}>
                          Awaiting on-chain confirmation…
                        </Text>
                      )}
                      {stakingState === "confirmed" && (
                        <Text style={styles.confirmedText}>
                          ✅ On-chain stake confirmed
                          {stakeTxHash ? ` (${shorten(stakeTxHash)})` : ""}
                        </Text>
                      )}
                    </View>
                  )}
                  {!hasOnchainJoined && (
                    <View style={{ marginTop: 8, gap: 8, alignItems: "center" }}>
                      <Pressable
                        onPress={handleRefreshOnchain}
                        style={[styles.refreshBtn, refreshLoading && { opacity: 0.7 }]}
                        disabled={refreshLoading}
                      >
                        {refreshLoading ? (
                          <ActivityIndicator size="small" color={colors.text} />
                        ) : (
                          <Text style={styles.refreshBtnText}>Refresh on-chain status</Text>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={handleConsumeCredits}
                        style={[styles.refreshBtn, consumeLoading && { opacity: 0.7 }]}
                        disabled={consumeLoading}
                      >
                        {consumeLoading ? (
                          <ActivityIndicator size="small" color={colors.text} />
                        ) : (
                          <Text style={styles.refreshBtnText}>Consume my credits</Text>
                        )}
                      </Pressable>
                    </View>
                  )}

                  {hasOnchainJoined && (
                    <Link
                      href={{ pathname: "/recordRun", params: { id: challenge.id } }}
                      asChild
                    >
                      <Pressable style={[styles.recordButton, { marginTop: 10 }]} onPress={handleStartRecording}>
                        <Ionicons name="play" size={16} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.recordButtonText}>Start Recording</Text>
                      </Pressable>
                    </Link>
                  )}
                  {lastJoinInfo?.to && lastJoinInfo?.valueWei && (
                    <View style={styles.copyRowContainer}>
                      <View style={styles.copyRow}>
                        <Text style={styles.copyLabel}>Send to</Text>
                        <Pressable
                          onPress={async () => {
                            await Clipboard.setStringAsync(lastJoinInfo!.to!);
                            Alert.alert("Copied", "Escrow address copied");
                          }}
                        >
                          <Text style={styles.copyValue}>
                            {shorten(lastJoinInfo!.to!)}
                          </Text>
                        </Pressable>
                      </View>
                      <View style={styles.copyRow}>
                        <Text style={styles.copyLabel}>Amount</Text>
                        <Pressable
                          onPress={async () => {
                            await Clipboard.setStringAsync(
                              lastJoinInfo!.valueWei!,
                            );
                            Alert.alert("Copied", "Amount (wei) copied");
                          }}
                        >
                          <Text style={styles.copyValue}>
                            {formatEth(lastJoinInfo!.valueWei!)} ETH
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </CardContent>
              </Card>
            )
          ) : isCashedOut ? (
            <Card style={{ ...styles.cardSpacing, ...styles.cashedOutCard }}>
              <CardHeader
                title="💰 Added to Balance"
                icon={<Ionicons name="wallet" size={18} color="#10b981" />}
              />
              <CardContent>
                <Text style={styles.cashedOutText}>
                  ✅ Your {challengeStatus.winnerRewards} USDC winnings have
                  been added to your balance!
                </Text>
                {challengeStatus.runData && (
                  <View style={styles.resultStats}>
                    <View style={styles.resultItem}>
                      <Text style={styles.cashedOutValue}>
                        {RunCalculationService.formatDuration(
                          challengeStatus.runData.duration,
                        )}
                      </Text>
                      <Text style={styles.resultLabel}>Winning Time</Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.cashedOutValue}>
                        {RunCalculationService.formatDistance(
                          challengeStatus.runData.distance,
                        )}
                      </Text>
                      <Text style={styles.resultLabel}>Distance</Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.cashedOutValue}>
                        {challengeStatus.runData.pace}
                      </Text>
                      <Text style={styles.resultLabel}>Pace/km</Text>
                    </View>
                  </View>
                )}
                <Text style={styles.cashedOutNote}>
                  Visit your profile to cash out all your earnings. Thanks for
                  participating! 💚
                </Text>

                {challengeStatus.cashedOutAt && (
                  <Text style={styles.cashedOutDate}>
                    Cashed out on{" "}
                    {challengeStatus.cashedOutAt.toLocaleDateString()}
                  </Text>
                )}
              </CardContent>
            </Card>
          ) : isWinner ? (
            <Card style={{ ...styles.cardSpacing, ...styles.winnerCard }}>
              <CardHeader
                title="🏆 Challenge Winner!"
                icon={<Ionicons name="trophy" size={18} color="#DAA520" />}
              />
              <CardContent>
                <Text style={styles.winnerText}>
                  🎉 Congratulations! You won this challenge and earned{" "}
                  {challengeStatus.winnerRewards} USDC!
                </Text>
                {challengeStatus.runData && (
                  <View style={styles.resultStats}>
                    <View style={styles.resultItem}>
                      <Text style={styles.winnerValue}>
                        {RunCalculationService.formatDuration(
                          challengeStatus.runData.duration,
                        )}
                      </Text>
                      <Text style={styles.resultLabel}>Winning Time</Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.winnerValue}>
                        {RunCalculationService.formatDistance(
                          challengeStatus.runData.distance,
                        )}
                      </Text>
                      <Text style={styles.resultLabel}>Distance</Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.winnerValue}>
                        {challengeStatus.runData.pace}
                      </Text>
                      <Text style={styles.resultLabel}>Pace/km</Text>
                    </View>
                  </View>
                )}
                <Text style={styles.winnerNote}>
                  Your {challengeStatus.winnerRewards} USDC has been
                  automatically added to your wallet balance! Visit your profile
                  to cash out all your earnings. 🎊
                </Text>
              </CardContent>
            </Card>
          ) : isCompleted ? (
            <Card style={{ ...styles.cardSpacing, ...styles.completedCard }}>
              <CardHeader
                title="Challenge Completed!"
                icon={
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                }
              />
              <CardContent>
                <Text style={styles.completedText}>
                  Congratulations! You've completed this challenge.
                </Text>
                {challengeStatus.runData && (
                  <View style={styles.resultStats}>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultValue}>
                        {RunCalculationService.formatDuration(
                          challengeStatus.runData.duration,
                        )}
                      </Text>
                      <Text style={styles.resultLabel}>Your Time</Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultValue}>
                        {RunCalculationService.formatDistance(
                          challengeStatus.runData.distance,
                        )}
                      </Text>
                      <Text style={styles.resultLabel}>Distance</Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultValue}>
                        {challengeStatus.runData.pace}
                      </Text>
                      <Text style={styles.resultLabel}>Pace/km</Text>
                    </View>
                  </View>
                )}
                <Text style={styles.resultNote}>
                  Results have been submitted. Check back later for final
                  rankings!
                </Text>
              </CardContent>
            </Card>
          ) : isInProgress ? (
            <Card style={{ ...styles.cardSpacing, ...styles.inProgressCard }}>
              <CardHeader
                title="Challenge In Progress"
                icon={<Ionicons name="time" size={18} color="#f59e0b" />}
              />
              <CardContent>
                <Text style={styles.inProgressText}>
                  Your run is currently in progress. Complete your recording to
                  submit your result!
                </Text>
                {!hasOnchainJoined && (
                  <Pressable
                    onPress={handleRefreshOnchain}
                    style={[
                      styles.refreshBtn,
                      refreshLoading && { opacity: 0.7 },
                    ]}
                    disabled={refreshLoading}
                  >
                    {refreshLoading ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <Text style={styles.refreshBtnText}>
                        Refresh on-chain status
                      </Text>
                    )}
                  </Pressable>
                )}
                <Link
                  href={{
                    pathname: "/recordRun",
                    params: { id: challenge.id },
                  }}
                  asChild
                >
                  <Pressable style={styles.continueButton}>
                    <Ionicons
                      name="play"
                      size={16}
                      color="white"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.continueButtonText}>
                      Start Recording
                    </Text>
                  </Pressable>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card style={{ ...styles.cardSpacing, ...styles.joinedCard }}>
              <CardHeader
                title={
                  hasOnchainJoined
                    ? "Ready to Run!"
                    : "Awaiting Stake Confirmation"
                }
                icon={
                  <Ionicons
                    name={hasOnchainJoined ? "trophy" : "time"}
                    size={18}
                    color={hasOnchainJoined ? "#22c55e" : "#f59e0b"}
                  />
                }
              />
              <CardContent>
                <Text style={styles.joinedText}>
                  {hasOnchainJoined
                    ? "You've successfully joined this challenge on chain. Complete your run before the deadline to earn rewards!"
                    : "Your on-chain stake has not been detected yet. Please approve the transaction in your wallet, then return here."}
                </Text>
                <Link
                  href={{
                    pathname: "/recordRun",
                    params: { id: challenge.id },
                  }}
                  asChild
                >
                  <Pressable
                    style={[
                      styles.recordButton,
                      !hasOnchainJoined && { opacity: 0.6 },
                    ]}
                    onPress={handleStartRecording}
                    disabled={!hasOnchainJoined}
                  >
                    <Ionicons
                      name="play"
                      size={16}
                      color="white"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.recordButtonText}>Start Recording</Text>
                  </Pressable>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Countdown Timer - Only show for non-completed challenges */}
          {!isCompleted &&
            !isWinner &&
            !isCashedOut &&
            (() => {
              const { timeLeft, isExpired, progressValue } = getTimeRemaining();
              const expiryInfo = getExpiryInfo(challenge, challengeStatus);

              return (
                <Card style={styles.cardSpacing}>
                  <CardHeader
                    title="Time Remaining"
                    icon={
                      <Ionicons
                        name="time"
                        size={18}
                        color={expiryInfo.color}
                      />
                    }
                  />
                  <CardContent>
                    <View style={styles.timerContent}>
                      {isExpired ? (
                        <Text
                          style={[
                            styles.timeDisplay,
                            { color: expiryInfo.color },
                          ]}
                        >
                          {expiryInfo.text}
                        </Text>
                      ) : (
                        <Text
                          style={[
                            styles.timeDisplay,
                            { color: expiryInfo.color },
                          ]}
                        >
                          {formatTime(timeLeft)}
                        </Text>
                      )}
                      <Progress
                        value={progressValue}
                        style={styles.progressBar}
                      />
                      <Text style={styles.endDate}>
                        Challenge ends {challenge.endDate.toLocaleDateString()}
                      </Text>
                      <Text
                        style={[
                          styles.expiryStatus,
                          { color: expiryInfo.color },
                        ]}
                      >
                        {expiryInfo.text}
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              );
            })()}

          {/* Enhanced Participants List / Leaderboard */}
          <Card style={styles.cardSpacing}>
            <CardHeader
              title={LeaderboardService.getLeaderboardTitle(
                leaderboardData.isCompleted,
                leaderboardData.totalParticipants,
                challenge.maxParticipants,
              )}
              icon={
                <Ionicons
                  name={
                    LeaderboardService.getLeaderboardIcon(
                      leaderboardData.isCompleted,
                    ) as any
                  }
                  size={18}
                  color={LeaderboardService.getLeaderboardIconColor(
                    leaderboardData.isCompleted,
                  )}
                />
              }
            />
            <CardContent>
              {leaderboardData.isCompleted ? (
                // Show final rankings
                <View>
                  {leaderboardData.entries.map((entry, index) => {
                    const isWinnerEntry =
                      entry.status === "winner" || entry.status === "cashOut";
                    const showPrize = isWinnerEntry && entry.prizeAmount;

                    return (
                      <View
                        key={entry.id}
                        style={[
                          styles.rankingRow,
                          isWinnerEntry ? styles.winnerRow : null,
                        ]}
                      >
                        <View style={styles.rankingPosition}>
                          {isWinnerEntry ? (
                            <Text
                              style={[styles.rankingNumber, styles.winnerText]}
                            >
                              👑
                            </Text>
                          ) : (
                            <Text style={styles.rankingNumber}>
                              {entry.ranking ? `#${entry.ranking}` : "-"}
                            </Text>
                          )}
                        </View>
                        {entry.avatar && (
                          <Avatar source={entry.avatar} size={28} />
                        )}
                        <View style={styles.rankingInfo}>
                          <Text
                            style={[
                              styles.rankingName,
                              isWinnerEntry ? styles.winnerText : null,
                            ]}
                          >
                            {entry.name}
                          </Text>
                          <View style={styles.rankingDetails}>
                            <Text style={styles.rankingStatus}>
                              {entry.status === "completed"
                                ? "Done"
                                : entry.status === "joined"
                                  ? "Joined"
                                  : entry.status === "cashOut"
                                    ? "Cashed Out"
                                    : "Winner"}
                            </Text>
                            {entry.runTime && (
                              <Text style={styles.rankingTime}>
                                {" "}
                                • {entry.runTime}
                              </Text>
                            )}
                          </View>
                        </View>
                        {showPrize && (
                          <View style={styles.prizeIndicator}>
                            <Text style={styles.prizeText}>
                              {entry.prizeAmount} USDC
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  <Text style={styles.rankingNote}>
                    {leaderboardData.message}
                  </Text>
                </View>
              ) : (
                // Show participants list for ongoing challenges
                <View>
                  {leaderboardData.entries.map((entry, index) => {
                    const isCreator = entry.id === "creator";
                    return (
                      <View key={entry.id}>
                        {index === 1 && <Separator />}
                        <View
                          style={
                            isCreator
                              ? styles.creatorRow
                              : styles.participantRow
                          }
                        >
                          {entry.avatar && (
                            <Avatar source={entry.avatar} size={32} />
                          )}
                          <View style={styles.participantInfo}>
                            <Text style={styles.participantName}>
                              {entry.name}
                            </Text>
                            <Text style={styles.participantStatus}>
                              {isCreator
                                ? "Creator • Done"
                                : entry.status === "completed"
                                  ? "Done"
                                  : "Joined"}
                            </Text>
                          </View>
                          <Badge
                            variant={
                              isCreator
                                ? "outline"
                                : entry.status === "completed"
                                  ? "default"
                                  : "outline"
                            }
                          >
                            <Text>
                              {isCreator
                                ? "Creator"
                                : entry.status === "completed"
                                  ? "Done"
                                  : "Joined"}
                            </Text>
                          </Badge>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerBanner: {
    backgroundColor: "#e64a00",
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    marginHorizontal: -spacing.lg,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  locationText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginLeft: spacing.xs,
  },
  headerTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: spacing.sm,
  },
  headerDescription: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    lineHeight: 22,
  },
  imageContainer: {
    height: 200,
    width: Dimensions.get("window").width,
    alignSelf: "center",
  },
  runnerImage: {
    width: "100%",
    height: "100%",
  },
  mainContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  statLabel: {
    ...typography.meta,
    marginTop: 4,
  },
  cardSpacing: {
    marginTop: spacing.lg,
  },
  mapPlaceholder: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.background,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  mapText: {
    ...typography.body,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  mapSubtext: {
    ...typography.meta,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  mapContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  routeMap: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  joinCard: {
    borderColor: "#e64a00",
    borderWidth: 1,
  },
  stakeInfo: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  stakeAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
  },
  stakeLabel: {
    ...typography.meta,
  },
  joinButton: {
    backgroundColor: "#e64a00",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  joinButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  stakeDisclaimer: {
    ...typography.meta,
    textAlign: "center",
    fontSize: 12,
  },
  joinedCard: {
    borderColor: "#22c55e",
    borderWidth: 1,
  },
  joinedText: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  recordButton: {
    backgroundColor: "#22c55e",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  recordButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  timerContent: {
    alignItems: "center",
  },
  timeDisplay: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e64a00",
    marginBottom: spacing.md,
  },
  progressBar: {
    marginBottom: spacing.md,
    alignSelf: "stretch",
  },
  endDate: {
    ...typography.meta,
    marginBottom: spacing.xs,
  },
  expiryStatus: {
    ...typography.meta,
    textAlign: "center",
    fontWeight: "500",
    fontSize: 14,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: "rgba(230, 74, 0, 0.1)",
    borderRadius: 8,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  participantInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  participantName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  participantStatus: {
    ...typography.meta,
    marginTop: 2,
  },
  // Completed challenge card
  completedCard: {
    borderColor: "#10b981",
    borderWidth: 1,
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  completedText: {
    ...typography.body,
    marginBottom: spacing.lg,
    color: "#059669",
  },
  resultStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 8,
  },
  resultItem: {
    alignItems: "center",
  },
  resultValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#059669",
  },
  resultLabel: {
    ...typography.meta,
    marginTop: 4,
    fontSize: 12,
  },
  resultNote: {
    ...typography.meta,
    textAlign: "center",
    fontStyle: "italic",
  },
  // In-progress challenge card
  inProgressCard: {
    borderColor: "#f59e0b",
    borderWidth: 1,
    backgroundColor: "rgba(245, 158, 11, 0.05)",
  },
  inProgressText: {
    ...typography.body,
    marginBottom: spacing.lg,
    color: "#d97706",
  },
  continueButton: {
    backgroundColor: "#22c55e",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Winner challenge card
  winnerCard: {
    borderColor: "#DAA520",
    borderWidth: 2,
    backgroundColor: "rgba(255, 215, 0, 0.05)",
  },
  winnerText: {
    ...typography.body,
    marginBottom: spacing.lg,
    color: "#B8860B",
    fontWeight: "600",
  },
  winnerValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#DAA520",
  },
  winnerNote: {
    ...typography.meta,
    textAlign: "center",
    fontStyle: "italic",
    color: "#B8860B",
    fontWeight: "500",
    marginBottom: spacing.lg,
  },
  cashOutButton: {
    backgroundColor: "#DAA520",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  cashOutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  addToBalanceButton: {
    backgroundColor: "#DAA520",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  addToBalanceButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Expired challenge card
  expiredCard: {
    borderColor: "#6b7280",
    borderWidth: 1,
    backgroundColor: "rgba(107, 114, 128, 0.05)",
  },
  expiredText: {
    ...typography.body,
    marginBottom: spacing.lg,
    color: "#6b7280",
    fontWeight: "500",
    textAlign: "center",
  },
  expiredStakeInfo: {
    alignItems: "center",
    marginBottom: spacing.lg,
    opacity: 0.7,
  },
  expiredStakeAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#6b7280",
    textDecorationLine: "line-through",
  },
  expiredStakeLabel: {
    ...typography.meta,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  expiredNote: {
    ...typography.meta,
    textAlign: "center",
    color: "#6b7280",
    fontStyle: "italic",
  },
  // Cashed out challenge card
  cashedOutCard: {
    borderColor: "#10b981",
    borderWidth: 2,
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  cashedOutText: {
    ...typography.body,
    marginBottom: spacing.lg,
    color: "#059669",
    fontWeight: "600",
  },
  cashedOutValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10b981",
  },
  cashedOutNote: {
    ...typography.meta,
    textAlign: "center",
    fontStyle: "italic",
    color: "#059669",
    fontWeight: "500",
    marginBottom: spacing.md,
  },
  cashedOutDate: {
    ...typography.meta,
    textAlign: "center",
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  // Ranking/Leaderboard styles
  rankingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  winnerRow: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderWidth: 1,
    borderColor: "#DAA520",
  },
  rankingPosition: {
    width: 40,
    alignItems: "center",
    marginRight: spacing.sm,
  },
  rankingNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
  },
  rankingInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  rankingName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  rankingDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  rankingTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rankingStatus: {
    fontSize: 12,
    color: colors.textMuted,
  },
  prizeIndicator: {
    backgroundColor: "#DAA520",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  prizeText: {
    fontSize: 12,
    color: "white",
    fontWeight: "bold",
  },
  rankingNote: {
    ...typography.meta,
    textAlign: "center",
    marginTop: spacing.lg,
    fontStyle: "italic",
    color: colors.textMuted,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  errorText: {
    ...typography.body,
    color: "#ef4444", // Red error color
    textAlign: "center",
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.accentStrong,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body,
    fontWeight: "600",
    color: "white",
  },
  awaitingText: {
    ...typography.meta,
    color: colors.textMuted,
  },
  confirmedText: {
    ...typography.meta,
    color: "#16a34a",
    fontWeight: "600",
  },
  refreshBtn: {
    marginTop: spacing.sm,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  refreshBtnText: {
    ...typography.meta,
    fontWeight: "600",
    color: colors.text,
  },
  copyRowContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  copyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  copyLabel: {
    ...typography.meta,
    color: colors.textMuted,
  },
  copyValue: {
    ...typography.body,
    fontWeight: "600",
    color: colors.text,
  },
});

function shorten(s: string, size = 6) {
  if (!s) return s;
  if (s.length <= size * 2) return s;
  return `${s.slice(0, size)}…${s.slice(-size)}`;
}

function formatEth(wei: string): string {
  try {
    const w = BigInt(wei);
    const ether = Number(w) / 1e18;
    // Avoid scientific notation for small amounts
    return ether.toLocaleString(undefined, { maximumFractionDigits: 18 });
  } catch {
    try {
      const w = BigInt(
        wei.startsWith("0x") ? wei : `0x${BigInt(wei).toString(16)}`,
      );
      const ether = Number(w) / 1e18;
      return ether.toLocaleString(undefined, { maximumFractionDigits: 18 });
    } catch {
      return wei;
    }
  }
}
