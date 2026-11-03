(() => {
  "use strict";

  // 以脚本位置计算站点根目录，兼容首页、pages 目录和本地文件。
  const siteRoot = new URL("../", document.currentScript.src);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // 下拉菜单的悬停、焦点展示交给 CSS；按钮负责触屏和 Escape 收起。
  document.querySelectorAll(".nav-group").forEach((group) => {
    const toggle = group.querySelector(".nav-toggle");
    const label = group.querySelector(".nav-heading a").textContent;
    toggle.hidden = false;

    const setExpanded = (expanded) => {
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute("aria-label", `${expanded ? "收起" : "展开"}${label}子菜单`);
    };
    const close = () => {
      group.classList.remove("is-open");
      group.classList.add("is-dismissed");
      setExpanded(false);
    };
    group.addEventListener("pointerenter", () => {
      group.classList.remove("is-dismissed");
      setExpanded(true);
    });
    group.addEventListener("pointerleave", () => {
      group.classList.remove("is-open");
      setExpanded(!group.classList.contains("is-dismissed") && group.contains(document.activeElement));
    });
    group.addEventListener("focusin", () => {
      group.classList.remove("is-dismissed");
      setExpanded(true);
    });
    group.addEventListener("focusout", (event) => {
      if (!group.contains(event.relatedTarget)) {
        group.classList.remove("is-open", "is-dismissed");
        setExpanded(group.matches(":hover"));
      }
    });
    toggle.addEventListener("click", () => {
      if (group.classList.contains("is-open")) {
        close();
      } else {
        group.classList.remove("is-dismissed");
        group.classList.add("is-open");
        setExpanded(true);
      }
    });
    group.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        toggle.focus();
        close();
      }
    });
  });
  document.addEventListener("click", (event) => {
    document.querySelectorAll(".nav-group.is-open").forEach((group) => {
      if (!group.contains(event.target)) {
        group.classList.remove("is-open");
        const toggle = group.querySelector(".nav-toggle");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", `展开${group.querySelector(".nav-heading a").textContent}子菜单`);
      }
    });
  });

  // 默认内容可见；只有支持观察器且允许动画时才为下方大区块渐入。
  const revealTargets = document.querySelectorAll("main > section, main > .theme-essays");
  let revealObserver;
  const showAll = () => {
    revealTargets.forEach((element) => element.classList.remove("reveal-pending"));
    revealObserver?.disconnect();
  };
  if ("IntersectionObserver" in window && !reducedMotion.matches) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove("reveal-pending");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: "0px 0px -32px 0px" });

    // 带锚点进入详情时直接展示，避免定位到尚未渐入的内容。
    if (!location.hash) {
      revealTargets.forEach((element) => {
        if (element.getBoundingClientRect().top >= window.innerHeight) {
          element.classList.add("reveal-region", "reveal-pending");
          revealObserver.observe(element);
        }
      });
    }
  }
  window.addEventListener("hashchange", showAll);
  reducedMotion.addEventListener("change", (event) => {
    if (event.matches) showAll();
  });

  const backToTop = document.querySelector(".back-to-top");
  const updateBackToTop = () => { backToTop.hidden = window.scrollY < 500; };
  window.addEventListener("scroll", updateBackToTop, { passive: true });
  updateBackToTop();
  backToTop.addEventListener("click", () => {
    // 先把键盘焦点移回顶部，再滚动，避免焦点留在即将隐藏的按钮上。
    const brand = document.querySelector(".site-header .brand");
    brand.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "instant" : "smooth" });
  });

  // 静态索引只维护真实页面；关键词用于同义词与主题匹配。
  const searchIndex = [
    { title: "关羽祠", path: "pages/landmarks.html#guanyu", text: "走近祠宇与忠义故事，了解华容道任务。", keywords: "关羽 忠义 三国 华容道 解谜" },
    { title: "宾阳楼", path: "pages/landmarks.html#binyang", text: "认识古城城楼与守护主题。", keywords: "古城 城墙 守城 宾阳楼" },
    { title: "张居正故居", path: "pages/landmarks.html#zhang", text: "走入庭院，理解革新与治理的取舍。", keywords: "张居正 故居 改革 革新 票拟 奏报" },
    { title: "荆州博物馆", path: "pages/landmarks.html#museum", text: "从器物细节走近荆楚文化与传承。", keywords: "博物馆 文物 修复 传承" },
    { title: "历史文化", path: "pages/history.html", text: "阅读忠义、古城、革新与传承四种文化主题。", keywords: "历史 文化 精神 内涵" },
    { title: "游戏介绍", path: "pages/introduction.html", text: "了解雾散荆州的创作背景、长卷与文化印记。", keywords: "游戏 介绍 雾散荆州 长卷 印章 印记 背景" },
    { title: "玩法指南", path: "pages/guide.html", text: "按步骤了解选站、互动任务和印章收集。", keywords: "玩法 指南 操作 步骤 帮助 任务 印章" },
    { title: "在线游玩", path: "pages/play.html", text: "打开原游戏，开始一段荆州之旅。", keywords: "在线 游玩 开始游戏 入口 试玩" }
  ];
  const searchSection = document.querySelector(".site-search");
  const form = searchSection.querySelector("form");
  const input = searchSection.querySelector("input");
  const status = document.querySelector("#search-status");
  const results = document.querySelector("#search-results");
  let composing = false;

  const renderResults = () => {
    const query = input.value.trim().toLocaleLowerCase();
    results.replaceChildren();
    results.hidden = true;
    if (!query) {
      status.textContent = "输入地标、文化主题或玩法关键词，寻找感兴趣的内容。";
      return;
    }
    const terms = query.split(/\s+/);
    const matches = searchIndex.filter((item) => {
      const content = `${item.title} ${item.text} ${item.keywords}`.toLocaleLowerCase();
      return terms.every((term) => content.includes(term));
    });
    if (!matches.length) {
      status.textContent = "暂时没有找到相关内容，试试“古城”“文物”或“玩法指南”。";
      return;
    }
    status.textContent = `找到 ${matches.length} 条相关内容。`;
    const fragment = document.createDocumentFragment();
    matches.forEach((item) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      const description = document.createElement("p");
      link.href = new URL(item.path, siteRoot).href;
      link.textContent = item.title;
      description.textContent = item.text;
      li.append(link, description);
      fragment.append(li);
    });
    results.append(fragment);
    results.hidden = false;
  };
  input.addEventListener("compositionstart", () => { composing = true; });
  input.addEventListener("compositionend", () => { composing = false; renderResults(); });
  input.addEventListener("input", () => { if (!composing) renderResults(); });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !event.isComposing) {
      input.value = "";
      renderResults();
    }
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    renderResults();
  });
  searchSection.hidden = false;
})();
