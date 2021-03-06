function* lex(s) {
  while (s !== '') {
    s = s.trim();

    if (s.startsWith('language:') || s.startsWith("l:") || s.startsWith("lang:")) {
      let i = 0;
      for (; i < s.length; i++) {
        if (s.charAt(i) == ':') {
          break;
        }
      }

      s = s.substring(i + 1);

      yield { type: 'language' };

    } else if (s.startsWith('"')) {
      s = s.substring(1);

      let i = 0;
      for (; i < s.length; i++) {
        if (s.charAt(i) == '"') {
          break;
        }
      }

      let ret = s.substring(0, i);
      s = s.substring(i + 1);

      yield { type: 'word', contents: ret };

    } else if (s.startsWith('<@')) {
      let skipped = 2;
      s_ = s.substring(2);
      if (s_.startsWith("!")) {
        skipped++;
        s_ = s_.substring(1);
      }

      let i = 0;
      for (; i < s_.length; i++) {
        if (s_.charAt(i) == '>') {
          let ret = s_.substring(0, i);
          s = s_.substring(i + 1);

          yield { type: 'user-mention', contents: ret };
          break;
        }
        if (s_.charAt(i) == " " || i == s_.length - 1) {
          let ret = s.substring(0, i + skipped);
          s = s.substring(i + skipped + 1);

          yield { type: 'word', contents: ret };
          break;
        }
      }

    } else {
      let i = 0;
      for (; i < s.length; i++) {
        if (s.charAt(i) == ' ') {
          break;
        }
      }

      let ret = s.substring(0, i);
      s = s.substring(i + 1);

      yield { type: "word", contents: ret };
    }
  }
  return {type: "end-of-message"};
}

commandStructure = (commandword) => {
  `${commandword}`: {
    add: {},
    delete: {aliases: ['remove', 'rm', 'del']},
    list: {aliases: ['ls']},
    help: {},
    config: {
      prefix: {},
      language: {}
    },
  }
}

Parser = (s, commandWord, clientUser) => {
  this.lexer = Lexer(s);
  this.commandStructure = commandStructure(s);
  this.current = lexer.next().value;
  this.clientUser = clientUser;
}

Parser.prototype.shouldParse() {
  if (this.current && this.current.type == "word" && this.current.contents in commandStructure) {
    return true;
  } else {
    return false;
  }
}

Parser.prototype.parse() {
  let command = [];
}

module.exports = {
  Lexer: function*(s) {
    let lexer = lex(s);
    while (true) {
      n = lexer.next();
      if (n.done) {
        return n.value;
      } else {
        yield { type: n.value.type, contents: (n.value.contents) ? n.value.contents.toLowerCase().normalize() : undefined };
      }
    }
}};
