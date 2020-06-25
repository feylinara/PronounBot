function* lex(s) {
  while (s !== '') {
    s = s.trim();

    if (s.startsWith('"')) {
      s = s.substring(1);

      let i = 0;
      for (; i < s.length; i++) {
        if (s.charAt(i) == '"') {
          break;
        }
      }

      let ret = s.substring(0, i);
      s = s.substring(i + 1);

      yield { type: 'quoted', contents: ret };

    } else if (s.startsWith('<@')) {
    } else {
      yield s;
    }
  }
}
