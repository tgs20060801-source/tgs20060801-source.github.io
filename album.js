(function () {
    const ALBUM_BUCKET = "album";
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    const MAX_FILE_SIZE = 5 * 1024 * 1024;

    const albumLoading = document.getElementById("albumLoading");
    const albumEmpty = document.getElementById("albumEmpty");
    const albumGrid = document.getElementById("albumGrid");
    const albumAdmin = document.getElementById("albumAdmin");
    const albumUploadForm = document.getElementById("albumUploadForm");
    const albumUploadButton = document.getElementById("albumUploadButton");
    const albumAdminStatus = document.getElementById("albumAdminStatus");

    const albumLightbox = document.getElementById("albumLightbox");
    const albumLightboxImage = document.getElementById("albumLightboxImage");
    const albumLightboxCaption = document.getElementById("albumLightboxCaption");
    const albumLightboxClose = document.getElementById("albumLightboxClose");

    let albumRows = [];

    function isAdminUser() {
        return typeof isAdmin !== "undefined" && Boolean(isAdmin);
    }

    function setPageStatus(message) {
        if (!albumLoading) {
            return;
        }

        albumLoading.textContent = message;
        albumLoading.hidden = !message;
    }

    function setAdminStatus(message, isError) {
        if (!albumAdminStatus) {
            return;
        }

        albumAdminStatus.textContent = message;
        albumAdminStatus.classList.toggle("error", Boolean(isError));
    }

    function clearNode(node) {
        if (!node) {
            return;
        }

        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    function formatShotDate(value) {
        if (!value) {
            return "";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return new Intl.DateTimeFormat("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(date);
    }

    function getFileExtension(file) {
        if (file.type === "image/jpeg") {
            return "jpg";
        }

        if (file.type === "image/png") {
            return "png";
        }

        if (file.type === "image/webp") {
            return "webp";
        }

        const rawExt = file.name.split(".").pop();
        return rawExt ? rawExt.toLowerCase() : "jpg";
    }

    function createUuid() {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    }

    function openLightbox(imageUrl, captionText) {
        if (!albumLightbox || !albumLightboxImage || !albumLightboxCaption) {
            return;
        }

        albumLightboxImage.src = imageUrl;
        albumLightboxCaption.textContent = captionText || "";
        albumLightbox.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
        if (!albumLightbox || !albumLightboxImage || !albumLightboxCaption) {
            return;
        }

        albumLightbox.hidden = true;
        albumLightboxImage.src = "";
        albumLightboxCaption.textContent = "";
        document.body.style.overflow = "";
    }

    function buildCard(photo, imageUrl, adminEnabled) {
        const card = document.createElement("article");
        card.className = "album-card";

        const imageButton = document.createElement("button");
        imageButton.type = "button";
        imageButton.className = "album-image-button";

        const image = document.createElement("img");
        image.className = "album-image";
        image.src = imageUrl;
        image.alt = photo.title || "相册照片";
        image.loading = "lazy";

        imageButton.appendChild(image);
        imageButton.addEventListener("click", () => {
            openLightbox(imageUrl, photo.title || "");
        });

        const info = document.createElement("div");
        info.className = "album-info";

        const title = document.createElement("h3");
        title.textContent = photo.title || "未命名照片";

        const desc = document.createElement("p");
        desc.textContent = photo.description || "";

        const meta = document.createElement("p");
        meta.className = "album-meta";
        const metaParts = [];

        if (photo.location) {
            metaParts.push(`地点：${photo.location}`);
        }

        const shotDate = formatShotDate(photo.shot_at);
        if (shotDate) {
            metaParts.push(`拍摄时间：${shotDate}`);
        }

        if (adminEnabled && !photo.is_visible) {
            metaParts.push("状态：已隐藏");
        }

        meta.textContent = metaParts.join(" | ");

        info.appendChild(title);
        if (photo.description) {
            info.appendChild(desc);
        }
        if (metaParts.length > 0) {
            info.appendChild(meta);
        }

        card.appendChild(imageButton);
        card.appendChild(info);

        if (adminEnabled) {
            const actions = document.createElement("div");
            actions.className = "album-actions";

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = "编辑";
            editButton.addEventListener("click", () => {
                editPhoto(photo);
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "album-delete-button";
            deleteButton.textContent = "删除";
            deleteButton.addEventListener("click", () => {
                deletePhoto(photo);
            });

            actions.appendChild(editButton);
            actions.appendChild(deleteButton);
            card.appendChild(actions);
        }

        return card;
    }

    async function loadAlbum() {
        if (!albumGrid || !albumEmpty) {
            return;
        }

        if (!supabaseClient) {
            setPageStatus("Supabase 未加载，暂时无法读取相册。");
            albumEmpty.hidden = false;
            albumEmpty.textContent = "当前无法连接相册服务。";
            return;
        }

        setPageStatus("正在加载相册...");
        albumEmpty.hidden = true;
        clearNode(albumGrid);

        try {
            const { data, error } = await supabaseClient
                .from("album_photos")
                .select("id, title, description, image_path, location, shot_at, sort_order, is_visible, created_at")
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: false });

            if (error) {
                throw error;
            }

            albumRows = Array.isArray(data) ? data : [];

            if (albumRows.length === 0) {
                setPageStatus("");
                albumEmpty.hidden = false;
                albumEmpty.textContent = "当前相册为空，暂无可展示照片。";
                return;
            }

            const adminEnabled = isAdminUser();

            albumRows.forEach((photo) => {
                const { data: publicUrlData } = supabaseClient.storage
                    .from(ALBUM_BUCKET)
                    .getPublicUrl(photo.image_path || "");

                const imageUrl = publicUrlData?.publicUrl || "";
                if (!imageUrl) {
                    return;
                }

                const card = buildCard(photo, imageUrl, adminEnabled);
                albumGrid.appendChild(card);
            });

            if (!albumGrid.children.length) {
                albumEmpty.hidden = false;
                albumEmpty.textContent = "当前相册为空，暂无可展示照片。";
            }

            setPageStatus("");
        } catch (error) {
            console.error("相册读取失败：", error);
            setPageStatus("数据读取失败，请稍后重试。");
            albumEmpty.hidden = false;
            albumEmpty.textContent = "相册加载失败，请稍后重试。";
        }
    }

    async function editPhoto(photo) {
        if (!supabaseClient) {
            setAdminStatus("Supabase 未加载，无法编辑照片。", true);
            return;
        }

        if (!isAdminUser()) {
            setAdminStatus("当前用户不是管理员，无法编辑照片。", true);
            return;
        }

        const nextTitle = window.prompt("请输入标题", photo.title || "");
        if (nextTitle === null) {
            return;
        }

        const safeTitle = nextTitle.trim();
        if (!safeTitle) {
            setAdminStatus("标题不能为空。", true);
            return;
        }

        const nextDescription = window.prompt("请输入照片说明", photo.description || "");
        if (nextDescription === null) {
            return;
        }

        const nextLocation = window.prompt("请输入拍摄地点", photo.location || "");
        if (nextLocation === null) {
            return;
        }

        const currentShotDate = photo.shot_at ? String(photo.shot_at).slice(0, 10) : "";
        const nextShotAt = window.prompt("请输入拍摄日期（YYYY-MM-DD，可留空）", currentShotDate);
        if (nextShotAt === null) {
            return;
        }

        const nextSortOrderRaw = window.prompt("请输入展示顺序（整数）", String(photo.sort_order ?? 0));
        if (nextSortOrderRaw === null) {
            return;
        }

        const nextSortOrder = Number.parseInt(nextSortOrderRaw, 10);
        if (Number.isNaN(nextSortOrder)) {
            setAdminStatus("展示顺序必须是整数。", true);
            return;
        }

        const nextVisible = window.confirm("点击“确定”为公开展示，点击“取消”为隐藏。\n当前状态：" + (photo.is_visible ? "公开" : "隐藏"));

        try {
            const { error } = await supabaseClient
                .from("album_photos")
                .update({
                    title: safeTitle,
                    description: nextDescription.trim(),
                    location: nextLocation.trim(),
                    shot_at: nextShotAt.trim() || null,
                    sort_order: nextSortOrder,
                    is_visible: nextVisible
                })
                .eq("id", photo.id);

            if (error) {
                throw error;
            }

            setAdminStatus("照片信息更新成功。", false);
            await loadAlbum();
        } catch (error) {
            console.error("编辑照片失败：", error);
            setAdminStatus("编辑失败：数据库保存失败。", true);
        }
    }

    async function deletePhoto(photo) {
        if (!supabaseClient) {
            setAdminStatus("Supabase 未加载，无法删除照片。", true);
            return;
        }

        if (!isAdminUser()) {
            setAdminStatus("当前用户不是管理员，无法删除照片。", true);
            return;
        }

        const confirmed = window.confirm(`确定删除照片《${photo.title || "未命名"}》吗？此操作不可恢复。`);
        if (!confirmed) {
            return;
        }

        let dbDeleted = false;

        try {
            const { error: deleteRowError } = await supabaseClient
                .from("album_photos")
                .delete()
                .eq("id", photo.id);

            if (deleteRowError) {
                console.error("删除照片记录失败：", deleteRowError);
                setAdminStatus("删除失败：数据库记录删除失败。", true);
                return;
            }

            dbDeleted = true;

            const { error: removeFileError } = await supabaseClient.storage
                .from(ALBUM_BUCKET)
                .remove([photo.image_path]);

            if (removeFileError) {
                console.error("删除图片文件失败：", removeFileError);
                setAdminStatus("删除部分成功：数据库记录已删除，但存储文件删除失败。", true);
                await loadAlbum();
                return;
            }

            setAdminStatus("删除成功。", false);
            await loadAlbum();
        } catch (error) {
            console.error("删除照片失败：", error);
            if (dbDeleted) {
                setAdminStatus("删除部分成功：数据库记录已删除，但删除文件时发生异常。", true);
            } else {
                setAdminStatus("删除失败，请稍后重试。", true);
            }
        }
    }

    async function uploadPhoto(event) {
        event.preventDefault();

        if (!supabaseClient) {
            setAdminStatus("Supabase 未加载，无法上传。", true);
            return;
        }

        if (!isAdminUser()) {
            setAdminStatus("当前用户不是管理员，无法上传。", true);
            return;
        }

        const fileInput = document.getElementById("albumFile");
        const titleInput = document.getElementById("albumTitle");
        const descriptionInput = document.getElementById("albumDescription");
        const locationInput = document.getElementById("albumLocation");
        const shotAtInput = document.getElementById("albumShotAt");
        const sortOrderInput = document.getElementById("albumSortOrder");
        const visibleInput = document.getElementById("albumVisible");

        if (!fileInput || !titleInput || !descriptionInput || !locationInput || !shotAtInput || !sortOrderInput || !visibleInput) {
            return;
        }

        const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        const title = titleInput.value.trim();

        if (!file) {
            setAdminStatus("请先选择要上传的照片文件。", true);
            return;
        }

        if (!title) {
            setAdminStatus("标题不能为空。", true);
            return;
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            setAdminStatus("仅支持 JPEG、PNG、WEBP 图片。", true);
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setAdminStatus("图片大小不能超过 5MB。", true);
            return;
        }

        const sortOrder = Number.parseInt(sortOrderInput.value || "0", 10);
        if (Number.isNaN(sortOrder)) {
            setAdminStatus("展示顺序必须是整数。", true);
            return;
        }

        albumUploadButton.disabled = true;
        albumUploadButton.textContent = "上传中...";
        setAdminStatus("正在上传照片...", false);

        let uploadedPath = "";

        try {
            const { data: userData, error: userError } = await supabaseClient.auth.getUser();

            if (userError || !userData?.user) {
                setAdminStatus("当前用户未登录，请先登录管理员账号。", true);
                return;
            }

            const user = userData.user;
            const extension = getFileExtension(file);
            const filename = `${Date.now()}-${createUuid()}.${extension}`;
            uploadedPath = `${user.id}/${filename}`;

            const { error: uploadError } = await supabaseClient.storage
                .from(ALBUM_BUCKET)
                .upload(uploadedPath, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type
                });

            if (uploadError) {
                console.error("上传文件失败：", uploadError);
                setAdminStatus("上传失败：图片文件上传失败。", true);
                return;
            }

            const { error: insertError } = await supabaseClient
                .from("album_photos")
                .insert([
                    {
                        title,
                        description: descriptionInput.value.trim(),
                        image_path: uploadedPath,
                        location: locationInput.value.trim(),
                        shot_at: shotAtInput.value || null,
                        sort_order: sortOrder,
                        is_visible: Boolean(visibleInput.checked),
                        created_by: user.id
                    }
                ]);

            if (insertError) {
                console.error("写入相册记录失败：", insertError);

                const { error: rollbackError } = await supabaseClient.storage
                    .from(ALBUM_BUCKET)
                    .remove([uploadedPath]);

                if (rollbackError) {
                    console.error("回滚上传文件失败：", rollbackError);
                }

                setAdminStatus("数据库保存失败，已尝试回滚上传文件。", true);
                return;
            }

            albumUploadForm.reset();
            const sortOrderField = document.getElementById("albumSortOrder");
            const visibleField = document.getElementById("albumVisible");
            if (sortOrderField) {
                sortOrderField.value = "0";
            }
            if (visibleField) {
                visibleField.checked = true;
            }

            setAdminStatus("上传成功。", false);
            await loadAlbum();
        } catch (error) {
            console.error("上传失败：", error);
            if (uploadedPath) {
                try {
                    await supabaseClient.storage.from(ALBUM_BUCKET).remove([uploadedPath]);
                } catch (rollbackError) {
                    console.error("异常回滚失败：", rollbackError);
                }
            }
            setAdminStatus("上传失败，请稍后重试。", true);
        } finally {
            albumUploadButton.disabled = false;
            albumUploadButton.textContent = "上传照片";
        }
    }

    async function initAlbum() {
        if (!albumGrid) {
            return;
        }

        if (!supabaseClient) {
            setPageStatus("Supabase 未加载，暂时无法读取相册。");
            if (albumEmpty) {
                albumEmpty.hidden = false;
                albumEmpty.textContent = "当前无法连接相册服务。";
            }
            return;
        }

        const adminAllowed = typeof detectAdminUser === "function" ? await detectAdminUser() : false;

        if (adminAllowed) {
            if (albumAdmin) {
                albumAdmin.hidden = false;
            }
            setAdminStatus("管理员已登录，可上传、编辑、删除照片。", false);
        } else {
            if (albumAdmin) {
                albumAdmin.hidden = true;
            }

            try {
                const { data: userData } = await supabaseClient.auth.getUser();
                if (userData?.user) {
                    setPageStatus("当前用户不是管理员，仅可查看公开照片。");
                }
            } catch (error) {
                console.error("读取用户状态失败：", error);
            }
        }

        await loadAlbum();
    }

    if (albumUploadForm) {
        albumUploadForm.addEventListener("submit", uploadPhoto);
    }

    if (albumLightboxClose) {
        albumLightboxClose.addEventListener("click", closeLightbox);
    }

    if (albumLightbox) {
        albumLightbox.addEventListener("click", (event) => {
            if (event.target === albumLightbox) {
                closeLightbox();
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && albumLightbox && !albumLightbox.hidden) {
            closeLightbox();
        }
    });

    initAlbum();
})();
