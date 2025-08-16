# App Idea

- running challenge app
- users upload their runs from strava, and then it creates a "challenge"
- a "challenge" is like a race in f1
- then, other users can click to participate in the race
- to participate, they need to stake a bit of crypto
- the winner of the race will get all of the money in the pot

# Rules of the race

- it must be completed within a specific timeframe (ie. within the next week)
- the user must not deviate too far from the track

# Some architecture

- the track should be recorded as a list of coordinates
- the user should use device gps to track their location and time during the run
- then comparison can be done to make sure they're on track
- run should initially be stored locally

- challenges should be able to browse, probably sort by closest
- users don't need to make an account, they should use coinbase onramp for staking
- they just need to enter a code name of some sort
- each run they completed, there should be a badge awarded (this should be minted as an nft)

# Main pages

- onboarding flow, 3 pages where they do some basic information
- main page: browse runs, upload runs
- run page: after clicking on a run, show some details about the "challenge", and give an option to join
- once joined, see everyone else who is running and a countdown timer for the race window
- once within the race window, option to start recording a run
- show the map, etc as if it was a run tracking app
- be able to stop the run and finish, and then upload to the challenge
- at that point, the user should have no other interactions with that challenge
- once the challenge expires, depending on how the user does, they will get an NFT and a badge for their place, participation

# Crypto Technology Integration

- Staking: use coinbase onramp to load money
- Smart contract for the staking (come up with a way for this)
- challenges should be stored as a contract on chain
- one the run is complete, just record the run on chain using an oracle
- use some sort of crypto for the payment 
