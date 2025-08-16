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

# App styles

- it is based on strava, here is some css that can be used

element.style {
}
.DzTRd:last-of-type {
    margin-bottom: 0;
}
.DzTRd {
    display: grid
;
    grid-auto-rows: 280px;
    grid-gap: 15px;
    grid-template-columns: repeat(auto-fill, minmax(286px, 1fr));
    list-style-type: none !important;
    margin-top: 12px;
    padding-left: 0;
}
@media (max-width: 992px) {
    ul {
        padding-left: 24px;
    }
}
ul, ol {
    margin-top: 0;
    margin-bottom: 9px;
}
ul, ol {
    padding: 0;
    list-style: none;
}
ul, ol {
    margin-top: 0;
    margin-bottom: 9px;
}
* {
    box-sizing: border-box;
}
user agent stylesheet
ul {
    display: block;
    list-style-type: disc;
    margin-block-start: 1em;
    margin-block-end: 1em;
    padding-inline-start: 40px;
    unicode-bidi: isolate;
}
body {
    color: #000;
    font-family: Boathouse, Segoe UI, Helvetica Neue, -apple-system, system-ui, BlinkMacSystemFont, Roboto, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;
    font-size: 14px;
    line-height: 18px;
}
body {
    background-color: #fff;
    font-family: "Boathouse", "Segoe UI", "Helvetica Neue", -apple-system, system-ui, BlinkMacSystemFont, Roboto, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
}
body {
    color: #242428;
    fill: currentColor;
    font-size: 14px;
    line-height: 1.45;
}
body, button, input, select, textarea {
    font-family: "Boathouse", "Segoe UI", "Helvetica Neue", -apple-system, system-ui, BlinkMacSystemFont, Roboto, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    font-weight: inherit;
}
body {
    font-family: -apple-system, system-ui, BlinkMacSystemFont, Roboto, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
    font-size: 14px;
    line-height: 1.3em;
    color: #000;
    background-color: #f7f7fa;
}
:root {
    --reach-tabs: 1;
}
:root {
    --reach-dialog: 1;
}
:root {
    --reach-dialog: 1;
}
:root {
    --reach-dialog: 1;
}
:root {
    --reach-tabs: 1;
}
:root {
    --reach-menu-button: 1;
}
html {
    font-size: 100%;
}
html {
    font-size: 10px;
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
}
html {
    font-family: sans-serif;
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
}
user agent stylesheet
:root {
    --arc-palette-backgroundExtra: #FDFDFDFF;
    --arc-palette-background: #EBEBECFF;
    --arc-background-gradient-color1: #444134FF;
    --arc-palette-foregroundTertiary: #EFF0F3FF;
    --arc-palette-foregroundPrimary: #343744FF;
    --arc-palette-maxContrastColor: #343744FF;
    --arc-palette-hover: #D6D7DAFF;
    --arc-background-gradient-color0: #343744FF;
    --arc-palette-focus: #999BA2FF;
    --arc-palette-cutoutColor: #EFF0F3FF;
    --arc-palette-title: #101014FF;
    --arc-palette-subtitle: #AEAFB4FF;
    --arc-palette-minContrastColor: #EFF0F3FF;
    --arc-palette-foregroundSecondary: #9095AAFF;
}
*:before, *:after {
    box-sizing: border-box;
}
*:before, *:after {
    box-sizing: border-box;
}
::selection {
    background-color: #fc5200;
    color: #fff;
    text-shadow: none;
}
::selection {
    background-color: #fc5200;
    color: #fff;
    text-shadow: none;
}
::selection {
    background-color: #fc5200;
    color: #fff;
    text-shadow: none;
}
::selection {
    background-color: #fc5200;
    color: #fff;
    text-shadow: none;
}
::selection {
    background-color: #fc5200;
    color: #fff;
    text-shadow: none;
}
::selection {
    background-color: #fc5200;
    color: #fff;
    text-shadow: none;
}
::selection {
    background-color: #fc5200;
    color: #fff;
    text-shadow: none;
}
::selection {
    background-color: #fc5200;
    color: #fff;
    text-shadow: none;
}
::selection {
    background-color: #fc5200;
    color: #fff;
    text-shadow: none;
}
::selection {
    background-color: #fc5200;
    color: #fff;
    text-shadow: none;
}
