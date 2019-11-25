# PronounBot

## Usage

### User Options
* Add a pronoun role to your roles\n +
  Use as `$^pronouns add <pronoun> [language:<language>]`, for example `^pronouns add ` or `pronouns add hen language:German`
* Delete a pronoun role from your roles
  Use as `^pronouns delete <pronoun> [language:<language>]`, for example `^pronouns delete vi/ver` or `pronoun delete x language:German`
* Show a help screen
  Use as `^pronouns help`

### Config Options

Options to configure how PronounBot acts in your server. Can only be
used by users with *Manage Server* permissions

* Set a server prefix Use as `$^pronouns prefix <prefix>`, for example
  `^pronouns prefix !`
* Set the server's primary language Use as `^pronouns language
  <language>`, for example `^pronouns language German`

## Setting Up

### Prerequisites

PronounBot needs a version of nodejs that supports `async/await` and
postgresql. You'll also need a dicord API key which you can get from
[here](https://discordapp.com/developers/applications/)

### Installation

1. Clone this repository
2. Run `./scripts/set-up.js` and insert the postgres access data and
   the discord secret key when prompted
3. Run `npm start postgrator -- -u <postgre username> -d <postgre database> -p <postgre password>`
4. Launch PronounBot with `npm start`
