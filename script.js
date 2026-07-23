const SUPABASE_URL = "https://imokmchcmeuctrmamjrr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Qn1qno4S-tYe94i-G00wGA_gtVxK3V9";

const supabaseClient = typeof supabase !== "undefined"
    ? supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

async function insertVisitorRecord() {
    if (!supabaseClient) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from("visitors")
            .insert([
                {
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) {
            console.error("访问记录写入失败：", error);
        }
    } catch (error) {
        console.error("访问记录写入失败：", error);
    }
}

async function updateVisitorCount() {
    const visitorCountElement = document.getElementById("visitorCount");

    if (!visitorCountElement) {
        return;
    }

    if (!supabaseClient) {
        visitorCountElement.textContent = "本站访问人数：--";
        return;
    }

    try {
        const { count, error } = await supabaseClient
            .from("visitors")
            .select("*", { count: "exact", head: true });

        if (error) {
            throw error;
        }

        visitorCountElement.textContent = `本站访问人数：${count ?? 0}`;
    } catch (error) {
        console.error("访问人数查询失败：", error);
        visitorCountElement.textContent = "本站访问人数：--";
    }
}

async function initVisitorStats() {
    await insertVisitorRecord();
    await updateVisitorCount();
}

function applyTheme(theme) {
    document.body.classList.toggle("dark-mode", theme === "dark");

    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
        themeToggle.textContent = theme === "dark"
            ? "☀️ 浅色模式"
            : "🌙 深色模式";
        themeToggle.setAttribute(
            "aria-label",
            theme === "dark"
                ? "切换为浅色模式"
                : "切换为深色模式"
        );
    }
}

function toggleTheme() {
    const nextTheme = document.body.classList.contains("dark-mode")
        ? "light"
        : "dark";

    localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
}

function showMessage() {
    window.location.href = "about.html";
}

function getAuthInput() {
    const emailInput = document.getElementById("authEmail");
    const passwordInput = document.getElementById("authPassword");
    const message = document.getElementById("authMessage");

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    message.textContent = "";

    if (!email || !password) {
        message.textContent = "请完整填写邮箱和密码。";
        return null;
    }

    if (password.length < 6) {
        message.textContent = "密码至少需要 6 位。";
        return null;
    }

    return {
        email,
        password,
        message
    };
}

async function registerUser() {
    if (!supabaseClient) {
        const message = document.getElementById("authMessage");
        if (message) {
            message.textContent = "当前无法连接到认证服务。";
        }
        return;
    }

    const input = getAuthInput();

    if (!input) {
        return;
    }

    input.message.textContent = "正在注册……";

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: input.email,
            password: input.password,
            options: {
                emailRedirectTo: "https://tgs20060801-source.github.io/"
            }
        });

        if (error) {
            input.message.textContent = "注册失败：" + error.message;
            return;
        }

        if (data.session) {
            input.message.textContent = "注册成功，并已登录。";
        } else {
            input.message.textContent = "注册成功，请前往邮箱完成验证。";
        }

        document.getElementById("authPassword").value = "";
        await updateAuthStatus();
    } catch (error) {
        input.message.textContent = "注册过程中出现错误，请稍后重试。";
        console.error(error);
    }
}

async function loginUser() {
    if (!supabaseClient) {
        const message = document.getElementById("authMessage");
        if (message) {
            message.textContent = "当前无法连接到认证服务。";
        }
        return;
    }

    const input = getAuthInput();

    if (!input) {
        return;
    }

    input.message.textContent = "正在登录……";

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email: input.email,
            password: input.password
        });

        if (error) {
            input.message.textContent = "登录失败：" + error.message;
            return;
        }

        document.getElementById("authPassword").value = "";
        await updateAuthStatus();
    } catch (error) {
        input.message.textContent = "登录过程中出现错误，请稍后重试。";
        console.error(error);
    }
}

async function logoutUser() {
    if (!supabaseClient) {
        const message = document.getElementById("authMessage");
        if (message) {
            message.textContent = "当前无法连接到认证服务。";
        }
        return;
    }

    const message = document.getElementById("authMessage");
    message.textContent = "正在退出……";

    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            message.textContent = "退出失败：" + error.message;
            return;
        }

        document.getElementById("authEmail").value = "";
        document.getElementById("authPassword").value = "";

        await updateAuthStatus();
        message.textContent = "已经退出登录。";
    } catch (error) {
        message.textContent = "退出过程中出现错误，请稍后重试。";
        console.error(error);
    }
}

async function updateAuthStatus() {
    const message = document.getElementById("authMessage");
    const logoutButton = document.getElementById("logoutButton");
    const emailInput = document.getElementById("authEmail");
    const passwordInput = document.getElementById("authPassword");
    const authButtons = document.querySelector(".auth-buttons");

    if (!message || !logoutButton || !emailInput || !passwordInput || !authButtons) {
        return;
    }

    if (!supabaseClient) {
        return;
    }

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        message.textContent = "读取登录状态失败：" + error.message;
        return;
    }

    const session = data.session;

    if (session) {
        logoutButton.hidden = false;
        emailInput.disabled = true;
        passwordInput.disabled = true;
        authButtons.hidden = true;
        message.textContent = "当前已登录：" + session.user.email;
    } else {
        logoutButton.hidden = true;
        emailInput.disabled = false;
        passwordInput.disabled = false;
        authButtons.hidden = false;
    }
}

function formatCommentTime(value) {
    if (!value) {
        return "刚刚";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "刚刚";
    }

    return new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function setCommentStatus(message, type = "") {
    const statusElement = document.getElementById("commentStatus");

    if (!statusElement) {
        return;
    }

    statusElement.textContent = message;
    statusElement.className = "comment-status";

    if (type === "success") {
        statusElement.classList.add("success");
    }

    if (type === "error") {
        statusElement.classList.add("error");
    }
}

function renderComments(comments) {
    const commentsList = document.getElementById("commentsList");
    const commentCount = document.getElementById("commentCount");

    if (!commentsList) {
        return;
    }

    if (commentCount) {
        commentCount.textContent = `共 ${comments?.length ?? 0} 条留言`;
    }

    commentsList.innerHTML = "";

    if (!comments || comments.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "comment-content";
        emptyMessage.textContent = "目前还没有留言，快来留下一句吧。";
        commentsList.appendChild(emptyMessage);
        return;
    }

    comments.forEach((comment) => {
        const card = document.createElement("article");
        card.className = "comment-card";

        const meta = document.createElement("div");
        meta.className = "comment-meta";

        const author = document.createElement("div");
        author.className = "comment-author";
        author.textContent = comment.name || "匿名用户";

        const time = document.createElement("div");
        time.className = "comment-time";
        time.textContent = formatCommentTime(comment.created_at);

        meta.appendChild(author);
        meta.appendChild(time);

        const content = document.createElement("p");
        content.className = "comment-content";
        content.textContent = comment.message || "";

        card.appendChild(meta);
        card.appendChild(content);
        commentsList.appendChild(card);
    });
}

async function loadComments() {
    const commentsList = document.getElementById("commentsList");

    if (!commentsList) {
        return;
    }

    if (!supabaseClient) {
        commentsList.innerHTML = "<p>当前无法连接到留言服务。</p>";
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("comments")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        renderComments(data);
    } catch (error) {
        console.error("读取留言失败：", error);
        commentsList.innerHTML = "<p>留言加载失败，请稍后重试。</p>";
    }
}

async function submitComment(event) {
    event.preventDefault();

    const form = document.getElementById("commentForm");
    const nameInput = document.getElementById("commentName");
    const messageInput = document.getElementById("commentMessage");
    const statusElement = document.getElementById("commentStatus");
    const submitButton = form?.querySelector("button[type='submit']");

    if (!form || !nameInput || !messageInput || !statusElement) {
        return;
    }

    if (!supabaseClient) {
            setCommentStatus("❌ 当前无法连接到留言服务。", "error");
            return;
        }

        const name = nameInput.value.trim();
        const message = messageInput.value.trim();

        if (!name || !message) {
            setCommentStatus("❌ 昵称和留言内容都不能为空。", "error");
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "提交中...";
        }

        setCommentStatus("", "");

        try {
            const { error } = await supabaseClient
                .from("comments")
                .insert([
                    {
                        name,
                        message
                    }
                ]);

            if (error) {
                throw error;
            }

            form.reset();
            setCommentStatus("✅ 留言成功！", "success");
            window.setTimeout(() => {
                setCommentStatus("", "");
            }, 2000);
            await loadComments();
        } catch (error) {
            console.error("提交留言失败：", error);
            setCommentStatus("❌ 留言失败，请稍后重试", "error");
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "提交留言";
        }
    }
}

const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

if (supabaseClient) {
    initVisitorStats();
}

if (supabaseClient && document.getElementById("authEmail")) {
    supabaseClient.auth.onAuthStateChange(() => {
        updateAuthStatus();
    });

    updateAuthStatus();
}

const commentForm = document.getElementById("commentForm");
if (commentForm) {
    commentForm.addEventListener("submit", submitComment);
    loadComments();
}
