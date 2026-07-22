const SUPABASE_URL = "https://imokmchcmeuctrmamjrr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Qn1qno4S-tYe94i-G00wGA_gtVxK3V9";

const supabaseClient = typeof supabase !== "undefined"
    ? supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

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

const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

if (supabaseClient && document.getElementById("authEmail")) {
    supabaseClient.auth.onAuthStateChange(() => {
        updateAuthStatus();
    });

    updateAuthStatus();
}
