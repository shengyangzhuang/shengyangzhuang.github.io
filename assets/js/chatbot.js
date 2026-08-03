/**
 * AI chatbot widget for shengyangzhuang.github.io
 *
 * Works in two modes:
 *
 * 1. SCRIPTED MODE (current, no API key needed): the panel opens by default,
 *    visitors click topic buttons (or type) and get pre-written answers from
 *    the LOCAL_TOPICS knowledge base below. Typed questions are matched by
 *    keyword. Everything runs in the browser.
 *
 * 2. AI MODE (optional, later): deploy the Cloudflare Worker in
 *    chatbot-worker/ (see DEPLOY.md) and paste its URL into WORKER_URL
 *    below. Topic buttons keep their instant scripted answers, but typed
 *    questions are then answered by Claude with the full CV as context.
 */
(function () {
    "use strict";

    // ⬇️ Leave as-is for scripted mode. Paste your Cloudflare Worker URL
    //    here later to enable real AI answers for typed questions.
    const WORKER_URL = "";

    const OPEN_BY_DEFAULT = true; // desktop only; mobile starts as a bubble

    const WELCOME_MESSAGE =
        "Hi! 👋 I'm Shengyang's assistant. Pick a topic below, or type a question.";

    const CONTACT_LINE =
        "\nFor anything else, feel free to email Shengyang at " +
        "shengyang.zhuang.25@ucl.ac.uk :)";

    // ------------------------------------------------- local knowledge ----
    // Each topic: button label, keywords for matching typed questions,
    // and the scripted answer (supports **bold**, links, and \n).
    const LOCAL_TOPICS = [
        {
            label: "About Shengyang",
            keywords: ["about", "who", "introduce", "introduction", "background", "himself", "bio"],
            answer:
                "**Shengyang Zhuang (庄昇洋)** is a PhD student in Robotics and AI at the " +
                "Department of Computer Science, **University College London**, supervised by " +
                "Dr. Amir Patel and Prof. Dimitrios Kanoulas.\n\n" +
                "Before UCL, he was a Robotics Research Engineer at **EPFL**, earned his MRes in " +
                "Medical Robotics with Distinction from **Imperial College London** (Hamlyn Centre), " +
                "spent his final undergraduate year at **ETH Zürich**, and holds a BEng in Automation " +
                "from **Harbin Institute of Technology**, where he graduated as one of the " +
                "\"Top Ten Outstanding Graduates\".\n\n" +
                "His motto: if he's going to do something, he wants to learn how to do it well. 🚀",
        },
        {
            label: "What's his PhD research about?",
            keywords: ["phd", "research", "cheetah", "locomotion", "irl", "ioc", "inverse", "reinforcement", "quadruped", "interest"],
            answer:
                "Shengyang's PhD aims to **understand cheetahs through robotics** 🐆 — how they " +
                "optimise stability, efficiency, and agility in movement. He uses **Inverse " +
                "Reinforcement Learning (IRL)** and **Inverse Optimal Control (IOC)** to uncover the " +
                "principles of cheetah locomotion, and wants to translate those insights into the " +
                "next generation of agile quadrupedal robots.\n\n" +
                "He's also interested in **General Robotics for Lab Automation** — perception-driven " +
                "robot systems that scientists can use without programming, including LLM-driven " +
                "task-level robot control (see his AUTOHIAM project).\n\n" +
                "Broadly, he works at the intersection of Robotics, Computer Vision, and Machine Learning.",
        },
        {
            label: "Projects",
            keywords: ["project", "portfolio", "autohiam", "sonoprint", "spine", "surgery", "tactile", "calibration", "work"],
            answer:
                "Some highlights from Shengyang's portfolio:\n\n" +
                "- **AUTOHIAM** (EPFL): an open-source robotic platform that automates hydrogel-infusion " +
                "additive manufacturing 24/7 — vision-based pose estimation, GPU-accelerated collision-free " +
                "motion planning (cuRobo), and natural-language interaction. Video: https://youtu.be/P0NdMLisDFo\n" +
                "- **Multi-Robot Spine Surgery System** (Imperial MRes thesis, Distinction): a cooperative " +
                "dual-KUKA system doing markerless tracking with collision avoidance.\n" +
                "- **SonoPrint** (ETH bachelor's thesis): an acoustically assisted volumetric 3D printer — " +
                "published in Advanced Materials as the cover image. 🏆\n" +
                "- **Soft optical tactile sensor** for tumour detection in robotic surgery.\n" +
                "- **handeye_calibration_ros2**: open-source ROS 2 hand-eye calibration packages, " +
                "presented at ROSCon China 2024.",
        },
        {
            label: "Publications",
            keywords: ["publication", "paper", "published", "journal", "thesis", "poster", "advanced materials"],
            answer:
                "Selected publications:\n\n" +
                "- **\"SonoPrint: Acoustically Assisted Volumetric 3D Printing for Composites\"**, " +
                "*Advanced Materials* (2024) — featured as the journal **cover image**. " +
                "https://doi.org/10.1002/adma.202408374\n" +
                "- MRes thesis: **\"Multi-Robot System Prototyping for Cooperative Control in " +
                "Robot-Assisted Spine Surgery\"**, Imperial College London — also presented as a poster " +
                "at the 16th Hamlyn Symposium on Medical Robotics.\n" +
                "- Bachelor's thesis: **\"SonoPrint: Acoustically Assisted Volumetric 3D Printing with " +
                "Feedback Optimization\"**, ETH Zürich (grade 6.0/6.0).\n\n" +
                "Full list: https://scholar.google.com/citations?user=FpjI1FwAAAAJ",
        },
        {
            label: "Education",
            keywords: ["education", "degree", "study", "studied", "university", "ucl", "imperial", "eth", "kth", "hit", "harbin", "master", "bachelor", "school"],
            answer:
                "Shengyang's academic journey spans five institutions across four countries: 🌍\n\n" +
                "- **PhD in Computer Science**, University College London (2025–present)\n" +
                "- **MRes in Medical Robotics**, Imperial College London — Distinction (2023–2024)\n" +
                "- **Visiting student**, ETH Zürich — bachelor's thesis graded 6.0/6.0 (2022–2023)\n" +
                "- **Exchange student in EECS**, KTH Royal Institute of Technology (2022)\n" +
                "- **BEng in Automation**, Harbin Institute of Technology — Top Ten Outstanding " +
                "Graduates (2019–2023)\n\n" +
                "He's been supported by the UCL Research Studentship (with MathWorks) and the " +
                "Chiang Chen Overseas Fellowship ($50,000, one of 9 recipients in mainland China).",
        },
        {
            label: "Robots he works with",
            keywords: ["robot", "platform", "kuka", "piper", "agilex", "hardware", "half-cheetah"],
            answer:
                "Robotic platforms Shengyang has hands-on experience with: 🤖\n\n" +
                "- **Half-Cheetah** quadruped (current PhD research)\n" +
                "- **KUKA iiwa 7** / KUKA LBR Med (dual-arm surgical robotics at Imperial)\n" +
                "- **Piper** by AgileX Robotics\n\n" +
                "Plus plenty of software infrastructure around them: ROS 2, cuRobo GPU-accelerated " +
                "motion planning, and vision-based perception pipelines.",
        },
        {
            label: "Contact / Supervision",
            keywords: ["contact", "email", "reach", "collaborate", "collaboration", "supervision", "supervise", "student", "internship", "hire", "touch"],
            answer:
                "📮 The best way to reach Shengyang is by email: **shengyang.zhuang.25@ucl.ac.uk**\n\n" +
                "He welcomes research collaboration opportunities!\n\n" +
                "**For UCL students**: he currently offers supervision for research internships and " +
                "Master's thesis projects in cheetah 3D pose estimation, legged robot locomotion, and " +
                "robotic manipulation for lab automation.\n\n" +
                "You can also find him on:\n" +
                "- GitHub: https://github.com/shengyangzhuang\n" +
                "- LinkedIn: https://www.linkedin.com/in/shengyang-zhuang/\n" +
                "- YouTube: https://www.youtube.com/@easonnnz",
        },
    ];

    const FALLBACK_ANSWER =
        "I'm a simple assistant, so I can only answer questions about Shengyang's " +
        "background, PhD research, projects, publications, education, robots, and " +
        "contact info — try one of the buttons below!" + CONTACT_LINE;

    const MAX_HISTORY = 20; // turns kept and sent to the worker in AI mode

    // ---------------------------------------------------------------- DOM --
    const root = document.createElement("div");
    root.id = "sz-chatbot";
    root.innerHTML = `
        <button id="sz-chat-toggle" aria-label="Open chat">
            <i class="bi bi-chat-dots-fill"></i>
        </button>
        <div id="sz-chat-panel" hidden>
            <div class="sz-chat-header">
                <div class="sz-chat-title">
                    <i class="bi bi-robot"></i>
                    <div>
                        <strong>Shengyang's Assistant</strong>
                        <span>Ask me about Shengyang</span>
                    </div>
                </div>
                <button id="sz-chat-close" aria-label="Minimize chat"><i class="bi bi-dash-lg"></i></button>
            </div>
            <div class="sz-chat-messages" id="sz-chat-messages"></div>
            <div class="sz-chat-suggestions" id="sz-chat-suggestions"></div>
            <form class="sz-chat-form" id="sz-chat-form">
                <input id="sz-chat-input" type="text" maxlength="1000" autocomplete="off"
                       placeholder="Type a question..." />
                <button type="submit" aria-label="Send"><i class="bi bi-send-fill"></i></button>
            </form>
            <div class="sz-chat-footnote" id="sz-chat-footnote"></div>
        </div>`;
    document.body.appendChild(root);

    const toggleBtn = root.querySelector("#sz-chat-toggle");
    const panel = root.querySelector("#sz-chat-panel");
    const closeBtn = root.querySelector("#sz-chat-close");
    const messagesEl = root.querySelector("#sz-chat-messages");
    const suggestionsEl = root.querySelector("#sz-chat-suggestions");
    const form = root.querySelector("#sz-chat-form");
    const input = root.querySelector("#sz-chat-input");
    const footnote = root.querySelector("#sz-chat-footnote");

    const aiMode = /^https:\/\//.test(WORKER_URL);
    footnote.textContent = aiMode
        ? "AI-generated — may contain mistakes."
        : "Scripted assistant — for anything else, just email Shengyang!";

    // ------------------------------------------------------------- state --
    const history = []; // {role: "user"|"assistant", content} — AI mode only
    let busy = false;
    let started = false;
    let userInControl = false; // true once the visitor opens/closes/uses the chat

    // ----------------------------------------------------------- helpers --
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    // Minimal safe formatting: escape first, then bold + links + line breaks
    function formatReply(text) {
        let html = escapeHtml(text);
        html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        html = html.replace(
            /(https?:\/\/[^\s<)]+)/g,
            '<a href="$1" target="_blank" rel="noopener">$1</a>'
        );
        return html.replace(/\n/g, "<br>");
    }

    function addMessage(role, text) {
        const bubble = document.createElement("div");
        bubble.className = "sz-msg sz-msg-" + role;
        bubble.innerHTML = role === "assistant" ? formatReply(text) : escapeHtml(text);
        messagesEl.appendChild(bubble);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return bubble;
    }

    function showTyping() {
        const el = document.createElement("div");
        el.className = "sz-msg sz-msg-assistant sz-typing";
        el.innerHTML = "<span></span><span></span><span></span>";
        messagesEl.appendChild(el);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return el;
    }

    function renderSuggestions() {
        suggestionsEl.innerHTML = "";
        LOCAL_TOPICS.forEach((topic) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "sz-chip";
            chip.textContent = topic.label;
            chip.addEventListener("click", () => answerTopic(topic));
            suggestionsEl.appendChild(chip);
        });
    }

    // --------------------------------------------------- scripted answers --
    function answerTopic(topic) {
        if (busy) return;
        userInControl = true; // reading an answer — don't auto-minimize on scroll
        addMessage("user", topic.label);
        const typing = showTyping();
        setTimeout(() => {
            typing.remove();
            addMessage("assistant", topic.answer);
        }, 400 + Math.random() * 400);
    }

    function matchLocalTopic(text) {
        const q = text.toLowerCase();
        let best = null;
        let bestScore = 0;
        LOCAL_TOPICS.forEach((topic) => {
            let score = 0;
            topic.keywords.forEach((kw) => {
                if (q.includes(kw)) score += kw.length; // longer keyword = stronger signal
            });
            if (score > bestScore) {
                bestScore = score;
                best = topic;
            }
        });
        return bestScore > 0 ? best : null;
    }

    function answerLocally(text) {
        const typing = showTyping();
        const topic = matchLocalTopic(text);
        setTimeout(() => {
            typing.remove();
            addMessage("assistant", topic ? topic.answer : FALLBACK_ANSWER);
        }, 400 + Math.random() * 400);
    }

    // --------------------------------------------------------- AI answers --
    async function answerWithAI(text) {
        busy = true;
        history.push({ role: "user", content: text });
        if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);

        const typing = showTyping();
        try {
            const res = await fetch(WORKER_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: history }),
            });
            const data = await res.json().catch(() => ({}));
            typing.remove();

            if (!res.ok || !data.reply) {
                addMessage("assistant", data.error || FALLBACK_ANSWER);
            } else {
                addMessage("assistant", data.reply);
                history.push({ role: "assistant", content: data.reply });
            }
        } catch (err) {
            typing.remove();
            // Worker unreachable — degrade gracefully to the scripted answers
            const topic = matchLocalTopic(text);
            addMessage("assistant", topic ? topic.answer : FALLBACK_ANSWER);
        } finally {
            busy = false;
            input.focus();
        }
    }

    // -------------------------------------------------------------- send --
    function sendMessage(text) {
        text = text.trim();
        if (!text || busy) return;
        input.value = "";
        addMessage("user", text);
        if (aiMode) {
            answerWithAI(text);
        } else {
            answerLocally(text);
        }
    }

    // ------------------------------------------------------------ events --
    function startConversation() {
        if (started) return;
        started = true;
        addMessage("assistant", WELCOME_MESSAGE);
        renderSuggestions();
    }

    // Close animation timings — keep in sync with .sz-closing in chatbot.css
    const CLOSE_DURATION = 360; // total shrink-into-icon animation
    const BUBBLE_APPEARS_AT = 200; // bubble pops in while the panel is still
                                   // shrinking, so the two visually morph
    let closeTimers = [];

    function clearCloseTimers() {
        closeTimers.forEach(clearTimeout);
        closeTimers = [];
    }

    function openPanel(focusInput) {
        clearCloseTimers();
        panel.classList.remove("sz-closing");
        panel.hidden = false;
        toggleBtn.classList.add("sz-hidden");
        startConversation();
        if (focusInput) input.focus();
    }

    function closePanel() {
        if (panel.hidden || panel.classList.contains("sz-closing")) return;
        clearCloseTimers();
        panel.classList.add("sz-closing");
        closeTimers.push(
            setTimeout(() => toggleBtn.classList.remove("sz-hidden"), BUBBLE_APPEARS_AT),
            setTimeout(() => {
                panel.hidden = true;
                panel.classList.remove("sz-closing");
            }, CLOSE_DURATION)
        );
    }

    // Once the visitor opens/closes/uses the chat themselves, scroll stops
    // controlling it — we never yank the panel away mid-conversation.
    function takeControl() {
        userInControl = true;
    }

    toggleBtn.addEventListener("click", () => {
        takeControl();
        openPanel(true);
    });
    closeBtn.addEventListener("click", () => {
        takeControl();
        closePanel();
    });
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        takeControl();
        sendMessage(input.value);
    });

    // ------------------------------------------------------ scroll logic --
    // Visible over the hero, minimized to a bubble once the visitor scrolls
    // into the page content.
    function heroThreshold() {
        const hero = document.getElementById("hero");
        const heroHeight = hero ? hero.offsetTop + hero.offsetHeight : window.innerHeight;
        return Math.max(heroHeight - 120, 80);
    }

    let ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
            ticking = false;
            if (userInControl || window.innerWidth < 768) return;
            const pastHero = window.scrollY > heroThreshold();
            // Treat a panel mid-close as already closed, so scrolling back up
            // during the animation re-opens it instead of being ignored
            const isOpen = !panel.hidden && !panel.classList.contains("sz-closing");
            if (pastHero && isOpen) {
                closePanel();
            } else if (!pastHero && !isOpen) {
                openPanel(false);
            }
        });
    }

    // Open by default on desktop; stay as a bubble on small screens.
    // No focus steal — visitors keep scrolling the page normally.
    if (OPEN_BY_DEFAULT && window.innerWidth >= 768) {
        if (window.scrollY <= heroThreshold()) openPanel(false);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    }
})();
