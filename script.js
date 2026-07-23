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

function renderComments(comments) {
    const commentsList = document.getElementById("commentsList");

    if (!commentsList) {
        return;
    }

    if (!comments || comments.length === 0) {
        commentsList.innerHTML = "<p>目前还没有留言，快来留下一句吧。</p>";
        return;
    }

    commentsList.innerHTML = comments.map((comment) => `
        <article style="padding: 14px; border: 1px solid #d0d7de; border-radius: 10px; background: rgba(255,255,255,0.72);">
            <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 8px;">
                <strong>${comment.name || "匿名用户"}</strong>
                <span style="color: #6b7280; font-size: 0.9em;">${formatCommentTime(comment.created_at)}</span>
            </div>
            <p style="margin: 0; white-space: pre-wrap;">${comment.message || ""}</p>
        </article>
    `).join("");
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

    if (!form || !nameInput || !messageInput || !statusElement) {
        return;
    }

    if (!supabaseClient) {
        statusElement.textContent = "当前无法连接到留言服务。";
        return;
    }

    const name = nameInput.value.trim();
    const message = messageInput.value.trim();

    if (!name || !message) {
        statusElement.textContent = "昵称和留言内容都不能为空。";
        return;
    }

    statusElement.textContent = "正在提交留言……";

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
        statusElement.textContent = "留言提交成功！";
        await loadComments();
    } catch (error) {
        console.error("提交留言失败：", error);
        statusElement.textContent = "留言提交失败，请稍后重试。";
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
