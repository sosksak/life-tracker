
/* v6.1 ICON ENGINE — swaps emoji in rendered text for the custom SVG set.
   Works on initial DOM and on every innerHTML/append via MutationObserver. */
(function () {
  var MAP = {"⋯": "dots", "📊": "chart", "📈": "trend-up", "📉": "trend-down", "💼": "briefcase", "📋": "clipboard", "📌": "pin", "✅": "check", "❌": "x", "✕": "close", "✓": "tick", "🎯": "target", "💰": "money", "🪙": "coin", "💵": "cash", "💸": "cash", "⚡": "bolt", "🎲": "dice", "🔥": "fire", "☕": "coffee", "🎁": "gift", "☁": "cloud", "📴": "cloud-off", "📵": "cloud-off", "🛠": "wrench", "🚀": "rocket", "🔄": "refresh", "⟳": "refresh", "🔒": "lock", "🔑": "key", "✨": "sparkles", "💫": "sparkles", "🌟": "sparkles", "👑": "crown", "⭐": "star", "☆": "star", "📝": "note", "💧": "drop", "🏆": "trophy", "💎": "diamond", "✏": "edit", "📱": "phone", "📲": "phone", "💪": "muscle", "🦾": "muscle", "🗑": "trash", "🛡": "shield", "💾": "save", "🏠": "home", "🎉": "party", "❤": "heart", "💜": "heart", "💚": "heart", "🏃": "run", "👤": "user", "👥": "users", "👯": "users", "⚠": "warning", "📅": "calendar", "📖": "book", "📚": "book", "🎨": "palette", "📓": "notebook", "📁": "notebook", "🧾": "note", "🌴": "palm", "😴": "zzz", "🌙": "moon", "☀": "sun", "🌅": "sun", "🌤": "sun", "🌆": "sun", "🏅": "medal", "🎖": "medal", "▶": "play", "⏸": "pause", "⏹": "stop", "⏱": "timer", "🕐": "clock", "⌛": "hourglass", "⚙": "gear", "➕": "plus", "📤": "export", "📥": "import", "🏪": "store", "🏢": "building", "🏛": "building", "👔": "shirt", "💬": "chat", "🗣": "speaker", "📢": "speaker", "🧠": "brain", "🌐": "globe", "💡": "bulb", "👀": "eye", "🌊": "wave", "🌱": "leaf", "🌿": "leaf", "🍀": "leaf", "🌲": "tree", "🌳": "tree", "🌸": "flower", "💐": "flower", "🌈": "rainbow", "👋": "hand", "🖐": "hand", "🙌": "hand", "🙏": "handshake", "📦": "box", "🔔": "bell", "🧭": "map", "⚖": "scale", "🏁": "flag", "🎩": "crown", "🍕": "pizza", "🍽": "cup", "📸": "camera", "🖼": "camera", "🎤": "mic", "🚪": "door", "✉": "mail", "🎬": "film", "📞": "phone-call", "🏋": "dumbbell", "💊": "pill", "💻": "laptop", "🚌": "bus", "🧮": "calc", "♟": "chess", "🎡": "wheel", "🎰": "wheel", "❓": "question", "🧘": "moon", "🪞": "mirror", "🧊": "square", "⬜": "square", "🔸": "circle", "🟢": "circle", "⬡": "circle", "😊": "face-happy", "😄": "face-happy", "😂": "face-happy", "🤑": "face-happy", "🙂": "face-ok", "😐": "face-meh", "😕": "face-sad", "😫": "face-bad", "😅": "face-ok", "😏": "face-cool", "😎": "face-cool", "🤔": "question", "💭": "chat", "🤖": "laptop", "🧍": "user", "👸": "crown", "🦸": "shield", "🦁": "fire", "🐺": "fire", "⚔": "bolt", "🏗": "building", "👂": "speaker", "💇": "mirror", "🧴": "drop", "💃": "run", "🔟": "badge", "🌧": "drop"};
  var SRC = '(?:' + "☁️|🛠️|✏️|🗑️|🛡️|❤️|⚠️|☀️|🎖️|▶️|⏸️|⏹️|⏱️|⚙️|🏛️|🖐️|⚖️|✉️|🏋️|⚔️|🌧️|📊|📈|📉|💼|📋|📌|✅|❌|✕|✓|🎯|💰|🪙|💵|💸|⚡|🎲|🔥|☕|🎁|☁|📴|📵|🛠|🚀|🔄|⟳|🔒|🔑|✨|💫|🌟|👑|⭐|☆|📝|💧|🏆|💎|✏|📱|📲|💪|🦾|🗑|🛡|💾|🏠|🎉|❤|💜|💚|🏃|👤|👥|👯|⚠|📅|📖|📚|🎨|📓|📁|🧾|🌴|😴|🌙|☀|🌅|🌤|🌆|🏅|🎖|▶|⏸|⏹|⏱|🕐|⌛|⚙|➕|📤|📥|🏪|🏢|👔|💬|🗣|📢|🧠|🌐|💡|👀|🌊|🌱|🌿|🍀|🌲|🌳|🌸|💐|🌈|👋|🙌|🙏|📦|🔔|🧭|🏁|🎩|🍕|🍽|📸|🖼|🎤|🚪|🎬|📞|💊|💻|🚌|🧮|♟|🎡|🎰|❓|🧘|🪞|🧊|⬜|🔸|🟢|⬡|😊|😄|😂|🤑|🙂|😐|😕|😫|😅|😏|😎|🤔|💭|🤖|🧍|👸|🦸|🦁|🐺|🏗|👂|💇|🧴|💃|🔟" + ')\\uFE0F?';
  var RE_T = new RegExp(SRC);
  var RE_G = new RegExp(SRC, 'g');
  var SKIP = { SCRIPT:1, STYLE:1, TEXTAREA:1, OPTION:1, TITLE:1, svg:1, SVG:1, CANVAS:1, INPUT:1, NOSCRIPT:1, SELECT:1 };
  var NS = 'http://www.w3.org/2000/svg', XL = 'http://www.w3.org/1999/xlink';

  function svg(name) {
    var el = document.createElementNS(NS, 'svg');
    el.setAttribute('class', 'ico ico-' + name);
    el.setAttribute('aria-hidden', 'true');
    var u = document.createElementNS(NS, 'use');
    u.setAttributeNS(XL, 'xlink:href', '#i-' + name);
    u.setAttribute('href', '#i-' + name);
    el.appendChild(u);
    return el;
  }
  function skip(p) {
    while (p && p.nodeType === 1) {
      if (SKIP[p.tagName] || (p.classList && p.classList.contains('no-ico'))) return true;
      p = p.parentNode;
    }
    return false;
  }
  function swap(node) {
    var t = node.nodeValue;
    if (!t || !RE_T.test(t)) return;
    var frag = document.createDocumentFragment(), last = 0, m;
    RE_G.lastIndex = 0;
    while ((m = RE_G.exec(t))) {
      if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
      var name = MAP[m[0].replace(/\uFE0F/g, '')] || MAP[m[0]];
      frag.appendChild(name ? svg(name) : document.createTextNode(m[0]));
      last = m.index + m[0].length;
    }
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    if (node.parentNode) node.parentNode.replaceChild(frag, node);
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!skip(root.parentNode)) swap(root); return; }
    if (root.nodeType !== 1 || skip(root)) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!RE_T.test(n.nodeValue)) return NodeFilter.FILTER_SKIP;
        return skip(n.parentNode) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var list = [];
    while (w.nextNode()) list.push(w.currentNode);
    for (var i = 0; i < list.length; i++) swap(list[i]);
  }
  function start() {
    walk(document.body);
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'characterData') walk(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.ICONS = { swap: walk, map: MAP, svg: function (n) { return svg(n).outerHTML; } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
