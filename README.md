# Gekko Revival [![npm](https://img.shields.io/npm/dm/gekko.svg)]() [![Build Status](https://travis-ci.org/askmike/gekko.png)](https://travis-ci.org/askmike/gekko) [![Build status](https://ci.appveyor.com/api/projects/status/github/askmike/gekko?branch=stable&svg=true)](https://ci.appveyor.com/project/askmike/gekko)

![Gordon Gekko](http://mikevanrossum.nl/static/gekko.jpg)

*The most valuable commodity I know of is information.*

– Gordon Gekko

Gekko is back! This is a fork of the original Gekko Bitcoin TA trading and backtesting platform. It connects to popular Bitcoin exchanges, now updated to leverage modern tools, libraries, and machine learning capabilities. It is written in JavaScript and runs on [Node.js](http://nodejs.org).

*Use Gekko at your own risk.*

## What's New?

- Updated Node.js and Vue.js frameworks
- Refreshed and secured all dependent libraries/packages
- Bug fixes and improved stability
- Introducing a Machine Learning Plugin: Use AI to enhance trading strategies

## Documentation

Visit [the documentation website](https://gekko.wizb.it/docs/introduction/about_gekko.html) for original resources. Current documentation is still valid!
Note: This fork is still in production and is not tested! Join the Discord below to start testing today!

## Installation & Usage

See the updated [installing Gekko doc](https://gekko.wizb.it/docs/installation/installing_gekko.html). Make sure you use Node.js version 18 to enjoy full compatibility.

## RL Environment Setup

After cloning the repo and running `npm install`, set up the RL backend:

# Linux/macOS setup
npm run setup:rl

# Windows setup
npm run setup:rl:win

## Note to devs: Updating the FinRL Submodule

If you've made changes to your FinRL fork and want to update the version used in this project:

```bash

1. Navigate into the submodule directory:
   cd external/finrl_api/finrl_mod

2. Pull the latest changes from your FinRL fork:
   git pull origin main  # or your working branch

3. Return to the root of the Gekko repo:
   cd ../../../..

4. Stage and commit the updated submodule pointer:
   git add external/finrl_api/finrl_mod
   git commit -m "Update FinRL submodule to latest commit"
   git push

This ensures others will use the same FinRL version when they clone the repo.
```
## Community & Support

Join the discussion about the revived Gekko project and automated trading on:

- [Gekko Forum](https://forum.gekko.wizb.it/) (original)
- **Discord**: [New Discord discussions!](https://discordapp.com/channels/1316559378236706868/1316559378236706871)

## Final

If Gekko Revival helps you in any way, you can leave me a tip at:  
**(BTC)** [3KifMK6PnPcv4MgcZE2XKcVBgHhr3nsXCY]

---

## Acknowledgment

This project builds on the incredible work of the original Gekko by askmike. Huge thanks to the community for keeping this project alive in spirit and inspiring its revival!

---
*This is an open-source project; contributions are welcome!*
