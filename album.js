(function () {
    const ALBUM_BUCKET = "album";
    const DEFAULT_COLLECTION_ID = "00000000-0000-0000-0000-000000000001";
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const UUID_REGEXP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const albumPageStatus = document.getElementById("albumPageStatus");
    const albumHomeView = document.getElementById("albumHomeView");
    const albumDetailView = document.getElementById("albumDetailView");
    const albumNotFound = document.getElementById("albumNotFound");

    const albumCollectionsGrid = document.getElementById("albumCollectionsGrid");
    const albumCollectionsEmpty = document.getElementById("albumCollectionsEmpty");

    const albumBackButton = document.getElementById("albumBackButton");
    const albumCurrentCollectionName = document.getElementById("albumCurrentCollectionName");
    const albumDetailTitle = document.getElementById("albumDetailTitle");
    const albumDetailDescription = document.getElementById("albumDetailDescription");
    const albumPhotoGrid = document.getElementById("albumPhotoGrid");
    const albumPhotoEmpty = document.getElementById("albumPhotoEmpty");

    const albumAdmin = document.getElementById("albumAdmin");

    const albumCollectionForm = document.getElementById("albumCollectionForm");
    const collectionName = document.getElementById("collectionName");
    const collectionDescription = document.getElementById("collectionDescription");
    const collectionVisible = document.getElementById("collectionVisible");
    const collectionCreateButton = document.getElementById("collectionCreateButton");
    const albumCollectionStatus = document.getElementById("albumCollectionStatus");

    const albumUploadForm = document.getElementById("albumUploadForm");
    const albumFile = document.getElementById("albumFile");
    const albumCollectionField = document.getElementById("albumCollectionField");
    const albumCollectionSelect = document.getElementById("albumCollectionSelect");
    const albumCollectionIdHidden = document.getElementById("albumCollectionIdHidden");
    const albumUploadButton = document.getElementById("albumUploadButton");
    const albumAdminStatus = document.getElementById("albumAdminStatus");

    const albumCollectionModal = document.getElementById("albumCollectionModal");
    const albumCollectionEditForm = document.getElementById("albumCollectionEditForm");
    const editCollectionId = document.getElementById("editCollectionId");
    const editCollectionName = document.getElementById("editCollectionName");
    const editCollectionDescription = document.getElementById("editCollectionDescription");
    const editCollectionVisible = document.getElementById("editCollectionVisible");
    const collectionCancelButton = document.getElementById("collectionCancelButton");
    const albumCollectionEditStatus = document.getElementById("albumCollectionEditStatus");

    const albumPhotoModal = document.getElementById("albumPhotoModal");
    const albumPhotoEditForm = document.getElementById("albumPhotoEditForm");
    const editPhotoId = document.getElementById("editPhotoId");
    const editPhotoTitle = document.getElementById("editPhotoTitle");
    const editPhotoCollection = document.getElementById("editPhotoCollection");
    const editPhotoDescription = document.getElementById("editPhotoDescription");
    const editPhotoLocation = document.getElementById("editPhotoLocation");
    const editPhotoShotAt = document.getElementById("editPhotoShotAt");
    const editPhotoSortOrder = document.getElementById("editPhotoSortOrder");
    const editPhotoVisible = document.getElementById("editPhotoVisible");
    const photoCancelButton = document.getElementById("photoCancelButton");
    const albumPhotoEditStatus = document.getElementById("albumPhotoEditStatus");

    const albumLightbox = document.getElementById("albumLightbox");
    const albumLightboxImage = document.getElementById("albumLightboxImage");
    const albumLightboxTitle = document.getElementById("albumLightboxTitle");
    const albumLightboxCounter = document.getElementById("albumLightboxCounter");
    const albumLightboxClose = document.getElementById("albumLightboxClose");
    const albumLightboxPrev = document.getElementById("albumLightboxPrev");
    const albumLightboxNext = document.getElementById("albumLightboxNext");

    const state = {
        isAdmin: false,
        currentCollectionId: null,
        collections: [],
        photoRows: [],
        lightboxIndex: -1,
        modalsOpen: 0,
        lightboxOpen: false
    };

    function isAdminUser() {
        return state.isAdmin && typeof isAdmin !== "undefined" && Boolean(isAdmin);
    }

    function isUuid(value) {
        return UUID_REGEXP.test(String(value || ""));
    }

    function setStatus(element, message, isError) {
        if (!element) {
            return;
        }

        element.textContent = message || "";
        element.hidden = !message;
        element.classList.toggle("error", Boolean(isError));
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

    function getCollectionById(collectionId) {
        return state.collections.find((item) => item.id === collectionId) || null;
    }

    function getSelectedUploadCollectionId() {
        if (state.currentCollectionId && isUuid(state.currentCollectionId)) {
            return state.currentCollectionId;
        }

        if (albumCollectionSelect) {
            return albumCollectionSelect.value;
        }

        if (albumCollectionIdHidden) {
            return albumCollectionIdHidden.value;
        }

        return "";
    }

    function extractTitleFromFilename(fileName) {
        const pureName = String(fileName || "").replace(/\.[^.]*$/, "").trim();
        return pureName || "照片";
    }

    function isLikelyAutoTitle(title) {
        const value = String(title || "").trim();
        if (!value) {
            return true;
        }

        return /^(img|dsc|image|screenshot|wechat|wximg|微信图片)[_-]?\d+/i.test(value)
            || /^\d{8,}$/.test(value)
            || /^[a-z]{2,6}_?\d{6,}$/i.test(value);
    }

    function resolveDisplayTitle(title) {
        const value = String(title || "").trim();
        if (!value || isLikelyAutoTitle(value)) {
            return "";
        }
        return value;
    }

    async function getNextPhotoSortOrder(collectionId) {
        const { data, error } = await supabaseClient
            .from("album_photos")
            .select("sort_order")
            .eq("collection_id", collectionId)
            .order("sort_order", { ascending: false })
            .limit(1);

        if (error) {
            throw error;
        }

        const currentMax = Array.isArray(data) && data.length > 0
            ? Number.parseInt(data[0].sort_order, 10)
            : -1;

        if (Number.isNaN(currentMax)) {
            return 0;
        }

        return currentMax + 1;
    }

    async function getNextCollectionSortOrder() {
        const { data, error } = await supabaseClient
            .from("album_collections")
            .select("sort_order")
            .order("sort_order", { ascending: false })
            .limit(1);

        if (error) {
            throw error;
        }

        const currentMax = Array.isArray(data) && data.length > 0
            ? Number.parseInt(data[0].sort_order, 10)
            : -1;

        if (Number.isNaN(currentMax)) {
            return 0;
        }

        return currentMax + 1;
    }

    function syncBodyLock() {
        document.body.style.overflow = (state.modalsOpen > 0 || state.lightboxOpen) ? "hidden" : "";
    }

    function toggleModal(modal, visible) {
        if (!modal) {
            return;
        }

        const wasHidden = modal.hidden;
        modal.hidden = !visible;
        if (wasHidden && visible) {
            state.modalsOpen += 1;
        }
        if (!wasHidden && !visible) {
            state.modalsOpen = Math.max(0, state.modalsOpen - 1);
        }
        syncBodyLock();
    }

    function showHomeView() {
        if (albumHomeView) {
            albumHomeView.hidden = false;
        }
        if (albumDetailView) {
            albumDetailView.hidden = true;
        }
        if (albumNotFound) {
            albumNotFound.hidden = true;
        }
    }

    function showDetailView() {
        if (albumHomeView) {
            albumHomeView.hidden = true;
        }
        if (albumDetailView) {
            albumDetailView.hidden = false;
        }
        if (albumNotFound) {
            albumNotFound.hidden = true;
        }
    }

    function showNotFoundView() {
        if (albumHomeView) {
            albumHomeView.hidden = true;
        }
        if (albumDetailView) {
            albumDetailView.hidden = true;
        }
        if (albumNotFound) {
            albumNotFound.hidden = false;
        }
    }

    function getCollectionFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const collectionId = params.get("collection");

        if (!collectionId) {
            return null;
        }

        if (!isUuid(collectionId)) {
            return "invalid";
        }

        return collectionId;
    }

    function createBadge(text, className) {
        const span = document.createElement("span");
        span.className = className;
        span.textContent = text;
        return span;
    }

    function buildCollectionCard(collection, info) {
        const card = document.createElement("article");
        card.className = "album-collection-card";

        const coverButton = document.createElement("button");
        coverButton.type = "button";
        coverButton.className = "album-collection-cover";

        if (info.coverUrl) {
            const coverImage = document.createElement("img");
            coverImage.className = "album-collection-image";
            coverImage.src = info.coverUrl;
            coverImage.alt = collection.name || "相册封面";
            coverImage.loading = "lazy";
            coverButton.appendChild(coverImage);
        } else {
            const placeholder = document.createElement("div");
            placeholder.className = "album-collection-placeholder";
            placeholder.textContent = "暂无照片";
            coverButton.appendChild(placeholder);
        }

        const overlay = document.createElement("div");
        overlay.className = "album-collection-overlay";

        const name = document.createElement("h3");
        name.textContent = collection.name || "未命名相册";

        const badges = document.createElement("div");
        badges.className = "album-collection-badges";
        badges.appendChild(createBadge(`${info.count} 张照片`, "album-collection-count"));

        if (isAdminUser() && !collection.is_visible) {
            badges.appendChild(createBadge("仅管理员可见", "album-collection-badge"));
        }

        overlay.appendChild(name);
        overlay.appendChild(badges);
        coverButton.appendChild(overlay);

        coverButton.addEventListener("click", () => {
            window.location.href = `./album.html?collection=${collection.id}`;
        });

        card.appendChild(coverButton);

        if (isAdminUser()) {
            const actions = document.createElement("div");
            actions.className = "album-actions";

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = "编辑相册";
            editButton.addEventListener("click", () => {
                openCollectionEditor(collection);
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "album-delete-button";

            actions.appendChild(editButton);

            if (collection.id === DEFAULT_COLLECTION_ID) {
                deleteButton.textContent = "默认相册";
                deleteButton.disabled = true;
                deleteButton.title = "默认相册受保护，不能删除";
            } else {
                deleteButton.textContent = "删除相册";
                deleteButton.addEventListener("click", () => {
                    deleteCollection(collection);
                });
            }

            actions.appendChild(deleteButton);

            card.appendChild(actions);
        }

        return card;
    }

    function buildCollectionPhotoMap(photos) {
        const result = new Map();

        photos.forEach((photo) => {
            const key = photo.collection_id;
            if (!key) {
                return;
            }

            if (!result.has(key)) {
                result.set(key, {
                    count: 0,
                    coverPath: ""
                });
            }

            const entry = result.get(key);
            entry.count += 1;
            if (!entry.coverPath && photo.image_path) {
                entry.coverPath = photo.image_path;
            }
        });

        return result;
    }

    async function fetchCollections() {
        const { data, error } = await supabaseClient
            .from("album_collections")
            .select("id, name, description, sort_order, is_visible, created_by, created_at, updated_at")
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        state.collections = Array.isArray(data) ? data : [];
    }

    async function renderCollectionsHome() {
        if (!albumCollectionsGrid || !albumCollectionsEmpty) {
            return;
        }

        clearNode(albumCollectionsGrid);
        albumCollectionsEmpty.hidden = true;

        if (!state.collections.length) {
            albumCollectionsEmpty.hidden = false;
            return;
        }

        let photoMap = new Map();

        try {
            const { data: photos, error: photosError } = await supabaseClient
                .from("album_photos")
                .select("collection_id, image_path, sort_order, created_at")
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: false });

            if (photosError) {
                throw photosError;
            }

            photoMap = buildCollectionPhotoMap(Array.isArray(photos) ? photos : []);
        } catch (error) {
            console.error("读取相册封面失败：", error);
        }

        state.collections.forEach((collection) => {
            const info = photoMap.get(collection.id) || { count: 0, coverPath: "" };
            let coverUrl = "";

            if (info.coverPath) {
                const { data: coverData } = supabaseClient.storage
                    .from(ALBUM_BUCKET)
                    .getPublicUrl(info.coverPath);

                coverUrl = coverData?.publicUrl || "";
            }

            const card = buildCollectionCard(collection, {
                count: info.count,
                coverUrl
            });
            albumCollectionsGrid.appendChild(card);
        });

        if (!albumCollectionsGrid.children.length) {
            albumCollectionsEmpty.hidden = false;
        }
    }

    function updateCollectionSelectOptions(selectElement, selectedId) {
        if (!selectElement) {
            return;
        }

        clearNode(selectElement);

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "请选择相册集";
        selectElement.appendChild(placeholder);

        state.collections.forEach((collection) => {
            const option = document.createElement("option");
            option.value = collection.id;
            option.textContent = collection.name || "未命名相册";
            selectElement.appendChild(option);
        });

        if (selectedId && isUuid(selectedId)) {
            selectElement.value = selectedId;
        }
    }

    function prepareAdminForms() {
        updateCollectionSelectOptions(albumCollectionSelect, state.currentCollectionId);
        updateCollectionSelectOptions(editPhotoCollection, state.currentCollectionId);
    }

    function buildPhotoCard(photo, imageUrl, index) {
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
            openLightbox(index);
        });

        card.appendChild(imageButton);

        if (isAdminUser()) {
            const info = document.createElement("div");
            info.className = "album-info";

            const displayTitle = resolveDisplayTitle(photo.title);
            if (displayTitle) {
                const title = document.createElement("h3");
                title.textContent = displayTitle;
                info.appendChild(title);
            }

            if (photo.description) {
                const desc = document.createElement("p");
                desc.textContent = photo.description;
                info.appendChild(desc);
            }

            const metaParts = [];
            if (photo.location) {
                metaParts.push(`地点：${photo.location}`);
            }

            const shotAt = formatShotDate(photo.shot_at);
            if (shotAt) {
                metaParts.push(`拍摄时间：${shotAt}`);
            }

            if (!photo.is_visible) {
                metaParts.push("状态：已隐藏");
            }

            if (metaParts.length > 0) {
                const meta = document.createElement("p");
                meta.className = "album-meta";
                meta.textContent = metaParts.join(" | ");
                info.appendChild(meta);
            }

            if (info.childNodes.length > 0) {
                card.appendChild(info);
            }
        }

        if (isAdminUser()) {
            const actions = document.createElement("div");
            actions.className = "album-actions";

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = "编辑";
            editButton.addEventListener("click", () => {
                openPhotoEditor(photo);
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

    async function loadCollectionPhotos(collectionId) {
        if (!albumPhotoGrid || !albumPhotoEmpty) {
            return;
        }

        clearNode(albumPhotoGrid);
        albumPhotoEmpty.hidden = true;
        state.photoRows = [];

        try {
            const { data, error } = await supabaseClient
                .from("album_photos")
                .select("id, title, description, image_path, location, shot_at, sort_order, is_visible, created_at, collection_id")
                .eq("collection_id", collectionId)
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: false });

            if (error) {
                throw error;
            }

            const rows = Array.isArray(data) ? data : [];
            state.photoRows = rows.map((photo) => {
                const { data: publicData } = supabaseClient.storage
                    .from(ALBUM_BUCKET)
                    .getPublicUrl(photo.image_path || "");

                return {
                    row: photo,
                    publicUrl: publicData?.publicUrl || ""
                };
            }).filter((item) => item.publicUrl);

            if (!state.photoRows.length) {
                albumPhotoEmpty.hidden = false;
                return;
            }

            state.photoRows.forEach((item, index) => {
                const card = buildPhotoCard(item.row, item.publicUrl, index);
                albumPhotoGrid.appendChild(card);
            });
        } catch (error) {
            console.error("读取照片失败：", error);
            setStatus(albumPageStatus, "数据读取失败，请稍后重试。", true);
            albumPhotoEmpty.hidden = false;
        }
    }

    function updateLightbox() {
        if (!albumLightboxImage || !albumLightboxTitle || !albumLightboxCounter) {
            return;
        }

        const total = state.photoRows.length;
        if (total <= 0 || state.lightboxIndex < 0 || state.lightboxIndex >= total) {
            return;
        }

        const current = state.photoRows[state.lightboxIndex];
        const displayTitle = resolveDisplayTitle(current.row.title);
        albumLightboxImage.src = current.publicUrl;
        albumLightboxImage.alt = current.row.title || "相册预览";
        albumLightboxTitle.textContent = displayTitle;
        albumLightboxTitle.hidden = !displayTitle;
        albumLightboxCounter.textContent = `${state.lightboxIndex + 1} / ${total}`;
    }

    function openLightbox(index) {
        if (!albumLightbox) {
            return;
        }

        if (!state.photoRows.length) {
            return;
        }

        state.lightboxIndex = index;
        state.lightboxOpen = true;
        albumLightbox.hidden = false;
        updateLightbox();
        syncBodyLock();
    }

    function closeLightbox() {
        if (!albumLightbox || !albumLightboxImage) {
            return;
        }

        state.lightboxOpen = false;
        state.lightboxIndex = -1;
        albumLightbox.hidden = true;
        albumLightboxImage.src = "";
        if (albumLightboxTitle) {
            albumLightboxTitle.textContent = "";
        }
        if (albumLightboxCounter) {
            albumLightboxCounter.textContent = "";
        }
        syncBodyLock();
    }

    function gotoPrevLightbox() {
        if (!state.lightboxOpen || !state.photoRows.length) {
            return;
        }

        state.lightboxIndex = (state.lightboxIndex - 1 + state.photoRows.length) % state.photoRows.length;
        updateLightbox();
    }

    function gotoNextLightbox() {
        if (!state.lightboxOpen || !state.photoRows.length) {
            return;
        }

        state.lightboxIndex = (state.lightboxIndex + 1) % state.photoRows.length;
        updateLightbox();
    }

    async function refreshByRoute() {
        const collectionInUrl = getCollectionFromUrl();
        state.currentCollectionId = null;

        if (collectionInUrl === "invalid") {
            showNotFoundView();
            setStatus(albumPageStatus, "相册不存在或暂不可见。", true);
            return;
        }

        if (!collectionInUrl) {
            showHomeView();
            setStatus(albumPageStatus, "", false);
            if (albumCollectionSelect) {
                albumCollectionSelect.value = "";
            }
            if (albumCollectionField) {
                albumCollectionField.hidden = false;
            }
            if (albumCollectionIdHidden) {
                albumCollectionIdHidden.value = "";
            }
            await renderCollectionsHome();
            return;
        }

        const currentCollection = state.collections.find((item) => item.id === collectionInUrl);
        if (!currentCollection) {
            showNotFoundView();
            setStatus(albumPageStatus, "相册不存在或暂不可见。", true);
            return;
        }

        state.currentCollectionId = collectionInUrl;
        showDetailView();
        setStatus(albumPageStatus, "", false);

        if (albumCollectionSelect) {
            albumCollectionSelect.value = collectionInUrl;
        }
        if (albumCollectionField) {
            albumCollectionField.hidden = true;
        }
        if (albumCollectionIdHidden) {
            albumCollectionIdHidden.value = collectionInUrl;
        }

        if (albumCurrentCollectionName) {
            albumCurrentCollectionName.textContent = currentCollection.name || "相册详情";
        }
        if (albumDetailTitle) {
            albumDetailTitle.textContent = currentCollection.name || "相册详情";
        }
        if (albumDetailDescription) {
            const detailText = (currentCollection.description || "").trim();
            if (detailText) {
                albumDetailDescription.textContent = detailText;
                albumDetailDescription.hidden = false;
            } else {
                albumDetailDescription.textContent = "";
                albumDetailDescription.hidden = true;
            }
        }

        await loadCollectionPhotos(collectionInUrl);
    }

    async function createCollection(event) {
        event.preventDefault();

        if (!supabaseClient) {
            setStatus(albumCollectionStatus, "Supabase 未加载，无法创建相册集。", true);
            return;
        }

        if (!isAdminUser()) {
            setStatus(albumCollectionStatus, "当前用户不是管理员。", true);
            return;
        }

        const name = collectionName ? collectionName.value.trim() : "";
        const description = collectionDescription ? collectionDescription.value.trim() : "";

        if (!name) {
            setStatus(albumCollectionStatus, "相册集名称不能为空。", true);
            return;
        }

        collectionCreateButton.disabled = true;
        collectionCreateButton.textContent = "创建中...";
        setStatus(albumCollectionStatus, "正在创建相册集...", false);

        try {
            const { data: userData, error: userError } = await supabaseClient.auth.getUser();

            if (userError || !userData?.user) {
                setStatus(albumCollectionStatus, "当前用户未登录，请先登录管理员账号。", true);
                return;
            }

            const sortOrder = await getNextCollectionSortOrder();

            const { error } = await supabaseClient
                .from("album_collections")
                .insert([
                    {
                        name,
                        description,
                        sort_order: sortOrder,
                        is_visible: Boolean(collectionVisible && collectionVisible.checked),
                        created_by: userData.user.id
                    }
                ]);

            if (error) {
                throw error;
            }

            albumCollectionForm.reset();
            if (collectionVisible) {
                collectionVisible.checked = true;
            }

            setStatus(albumCollectionStatus, "相册集创建成功。", false);
            await fetchCollections();
            prepareAdminForms();
            await refreshByRoute();
        } catch (error) {
            console.error("创建相册集失败：", error);
            setStatus(albumCollectionStatus, "创建失败，请稍后重试。", true);
        } finally {
            collectionCreateButton.disabled = false;
            collectionCreateButton.textContent = "创建相册集";
        }
    }

    function openCollectionEditor(collection) {
        if (!isAdminUser()) {
            return;
        }

        if (!albumCollectionModal || !albumCollectionEditForm) {
            return;
        }

        editCollectionId.value = collection.id;
        editCollectionName.value = collection.name || "";
        editCollectionDescription.value = collection.description || "";
        editCollectionVisible.checked = Boolean(collection.is_visible);
        setStatus(albumCollectionEditStatus, "", false);

        toggleModal(albumCollectionModal, true);
    }

    async function saveCollectionEdit(event) {
        event.preventDefault();

        if (!isAdminUser()) {
            setStatus(albumCollectionEditStatus, "当前用户不是管理员。", true);
            return;
        }

        const id = editCollectionId.value;
        const name = editCollectionName.value.trim();
        const description = editCollectionDescription.value.trim();

        if (!isUuid(id)) {
            setStatus(albumCollectionEditStatus, "相册集参数无效。", true);
            return;
        }

        if (!name) {
            setStatus(albumCollectionEditStatus, "相册集名称不能为空。", true);
            return;
        }

        try {
            const { error } = await supabaseClient
                .from("album_collections")
                .update({
                    name,
                    description,
                    is_visible: Boolean(editCollectionVisible.checked),
                    updated_at: new Date().toISOString()
                })
                .eq("id", id);

            if (error) {
                throw error;
            }

            toggleModal(albumCollectionModal, false);
            await fetchCollections();
            prepareAdminForms();
            await refreshByRoute();
            setStatus(albumCollectionStatus, "相册集已更新。", false);
        } catch (error) {
            console.error("更新相册集失败：", error);
            setStatus(albumCollectionEditStatus, "保存失败，请稍后重试。", true);
        }
    }

    async function deleteCollection(collection) {
        if (!isAdminUser()) {
            setStatus(albumCollectionStatus, "当前用户不是管理员。", true);
            return;
        }

        if (collection.id === DEFAULT_COLLECTION_ID) {
            setStatus(albumCollectionStatus, "默认相册不允许删除。", true);
            return;
        }

        try {
            const { count, error: countError } = await supabaseClient
                .from("album_photos")
                .select("id", { count: "exact", head: true })
                .eq("collection_id", collection.id);

            if (countError) {
                throw countError;
            }

            if ((count || 0) > 0) {
                setStatus(albumCollectionStatus, "该相册仍有照片，请先移动或删除其中照片。", true);
                return;
            }

            const confirmed = window.confirm("确认删除该空相册吗？删除后不可恢复。");
            if (!confirmed) {
                return;
            }

            const { error } = await supabaseClient
                .from("album_collections")
                .delete()
                .eq("id", collection.id);

            if (error) {
                throw error;
            }

            setStatus(albumCollectionStatus, "相册集删除成功。", false);
            await fetchCollections();
            prepareAdminForms();

            if (state.currentCollectionId === collection.id) {
                window.location.href = "./album.html";
                return;
            }

            await refreshByRoute();
        } catch (error) {
            console.error("删除相册集失败：", error);
            setStatus(albumCollectionStatus, "删除失败，请稍后重试。", true);
        }
    }

    async function uploadPhoto(event) {
        event.preventDefault();

        if (!supabaseClient) {
            setStatus(albumAdminStatus, "Supabase 未加载，无法上传。", true);
            return;
        }

        if (!isAdminUser()) {
            setStatus(albumAdminStatus, "当前用户不是管理员。", true);
            return;
        }

        const files = albumFile && albumFile.files
            ? Array.from(albumFile.files)
            : [];
        const collectionId = getSelectedUploadCollectionId();

        if (!files.length) {
            setStatus(albumAdminStatus, "请先选择照片文件。", true);
            return;
        }

        if (!isUuid(collectionId)) {
            setStatus(albumAdminStatus, "必须选择所属相册集。", true);
            return;
        }

        const selectedCollection = getCollectionById(collectionId);
        const targetCollectionName = selectedCollection?.name || "目标";
        const confirmText = files.length === 1
            ? `确定将这张照片上传到「${targetCollectionName}」相册吗？`
            : `确定将 ${files.length} 张照片上传到「${targetCollectionName}」相册吗？`;

        if (!window.confirm(confirmText)) {
            return;
        }

        albumUploadButton.disabled = true;
        albumUploadButton.textContent = "上传中...";
        setStatus(albumAdminStatus, "正在上传照片...", false);

        try {
            const { data: userData, error: userError } = await supabaseClient.auth.getUser();

            if (userError || !userData?.user) {
                setStatus(albumAdminStatus, "当前用户未登录，请先登录管理员账号。", true);
                return;
            }

            let nextSortOrder = await getNextPhotoSortOrder(collectionId);
            let successCount = 0;
            let failCount = 0;

            for (const file of files) {
                if (!ALLOWED_TYPES.includes(file.type)) {
                    failCount += 1;
                    continue;
                }

                if (file.size > MAX_FILE_SIZE) {
                    failCount += 1;
                    continue;
                }

                const extension = getFileExtension(file);
                const filename = `${Date.now()}-${createUuid()}.${extension}`;
                const uploadPath = `${userData.user.id}/${collectionId}/${filename}`;

                const { error: uploadError } = await supabaseClient.storage
                    .from(ALBUM_BUCKET)
                    .upload(uploadPath, file, {
                        cacheControl: "3600",
                        upsert: false,
                        contentType: file.type
                    });

                if (uploadError) {
                    console.error("上传文件失败：", uploadError);
                    failCount += 1;
                    continue;
                }

                const { error: insertError } = await supabaseClient
                    .from("album_photos")
                    .insert([
                        {
                            collection_id: collectionId,
                            title: extractTitleFromFilename(file.name),
                            description: "",
                            image_path: uploadPath,
                            location: "",
                            shot_at: null,
                            sort_order: nextSortOrder,
                            is_visible: true,
                            created_by: userData.user.id
                        }
                    ]);

                if (insertError) {
                    console.error("写入照片记录失败：", insertError);
                    failCount += 1;

                    const { error: rollbackError } = await supabaseClient.storage
                        .from(ALBUM_BUCKET)
                        .remove([uploadPath]);

                    if (rollbackError) {
                        console.error("回滚上传文件失败：", rollbackError);
                    }

                    continue;
                }

                successCount += 1;
                nextSortOrder += 1;
            }

            if (successCount > 0 && failCount === 0) {
                setStatus(albumAdminStatus, `成功上传 ${successCount} 张照片。`, false);
            } else if (successCount > 0) {
                setStatus(albumAdminStatus, `成功上传 ${successCount} 张，失败 ${failCount} 张。`, true);
            } else {
                setStatus(albumAdminStatus, `上传失败，共失败 ${failCount} 张。`, true);
            }

            if (albumFile) {
                albumFile.value = "";
            }

            await fetchCollections();
            prepareAdminForms();
            await refreshByRoute();
        } catch (error) {
            console.error("上传失败：", error);
            setStatus(albumAdminStatus, "上传失败，请稍后重试。", true);
        } finally {
            albumUploadButton.disabled = false;
            albumUploadButton.textContent = "上传照片";
        }
    }

    function openPhotoEditor(photo) {
        if (!isAdminUser()) {
            return;
        }

        updateCollectionSelectOptions(editPhotoCollection, photo.collection_id);

        editPhotoId.value = photo.id;
        editPhotoTitle.value = photo.title || "";
        editPhotoDescription.value = photo.description || "";
        editPhotoLocation.value = photo.location || "";
        editPhotoShotAt.value = photo.shot_at ? String(photo.shot_at).slice(0, 10) : "";
        editPhotoSortOrder.value = String(photo.sort_order ?? 0);
        editPhotoVisible.checked = Boolean(photo.is_visible);
        setStatus(albumPhotoEditStatus, "", false);

        toggleModal(albumPhotoModal, true);
    }

    async function savePhotoEdit(event) {
        event.preventDefault();

        if (!isAdminUser()) {
            setStatus(albumPhotoEditStatus, "当前用户不是管理员。", true);
            return;
        }

        const id = editPhotoId.value;
        const title = editPhotoTitle.value.trim();
        const collectionId = editPhotoCollection.value;
        const sortOrder = Number.parseInt(editPhotoSortOrder.value, 10);

        if (!isUuid(id)) {
            setStatus(albumPhotoEditStatus, "照片参数无效。", true);
            return;
        }

        if (!title) {
            setStatus(albumPhotoEditStatus, "标题不能为空。", true);
            return;
        }

        if (!isUuid(collectionId)) {
            setStatus(albumPhotoEditStatus, "必须选择所属相册集。", true);
            return;
        }

        if (Number.isNaN(sortOrder)) {
            setStatus(albumPhotoEditStatus, "展示顺序必须是整数。", true);
            return;
        }

        try {
            const { error } = await supabaseClient
                .from("album_photos")
                .update({
                    collection_id: collectionId,
                    title,
                    description: editPhotoDescription.value.trim(),
                    location: editPhotoLocation.value.trim(),
                    shot_at: editPhotoShotAt.value || null,
                    sort_order: sortOrder,
                    is_visible: Boolean(editPhotoVisible.checked)
                })
                .eq("id", id);

            if (error) {
                throw error;
            }

            toggleModal(albumPhotoModal, false);
            setStatus(albumAdminStatus, "照片信息已更新。", false);

            if (state.currentCollectionId && state.currentCollectionId !== collectionId) {
                await fetchCollections();
                prepareAdminForms();
            }

            await refreshByRoute();
        } catch (error) {
            console.error("更新照片失败：", error);
            setStatus(albumPhotoEditStatus, "保存失败，请稍后重试。", true);
        }
    }

    async function deletePhoto(photo) {
        if (!isAdminUser()) {
            setStatus(albumAdminStatus, "当前用户不是管理员。", true);
            return;
        }

        const confirmed = window.confirm("确定删除这张照片吗？此操作不可恢复。");
        if (!confirmed) {
            return;
        }

        let dbDeleted = false;

        try {
            const { error: rowError } = await supabaseClient
                .from("album_photos")
                .delete()
                .eq("id", photo.id);

            if (rowError) {
                console.error("删除照片记录失败：", rowError);
                setStatus(albumAdminStatus, "删除失败：数据库记录删除失败。", true);
                return;
            }

            dbDeleted = true;

            const { error: fileError } = await supabaseClient.storage
                .from(ALBUM_BUCKET)
                .remove([photo.image_path]);

            if (fileError) {
                console.error("删除图片文件失败：", fileError);
                setStatus(albumAdminStatus, "删除部分成功：数据库记录已删除，但文件删除失败。", true);
                await fetchCollections();
                await refreshByRoute();
                return;
            }

            setStatus(albumAdminStatus, "删除成功。", false);
            await fetchCollections();
            await refreshByRoute();
        } catch (error) {
            console.error("删除照片失败：", error);
            if (dbDeleted) {
                setStatus(albumAdminStatus, "删除部分成功：数据库记录已删除，但文件删除异常。", true);
            } else {
                setStatus(albumAdminStatus, "删除失败，请稍后重试。", true);
            }
        }
    }

    async function initAlbum() {
        if (!albumCollectionsGrid || !albumPhotoGrid) {
            return;
        }

        if (!supabaseClient) {
            setStatus(albumPageStatus, "Supabase 未加载，暂时无法读取相册。", true);
            showNotFoundView();
            return;
        }

        setStatus(albumPageStatus, "正在加载相册...", false);

        try {
            state.isAdmin = typeof detectAdminUser === "function" ? await detectAdminUser() : false;

            if (albumAdmin) {
                albumAdmin.hidden = !isAdminUser();
            }

            if (isAdminUser()) {
                setStatus(albumAdminStatus, "管理员已登录，可管理相册集和照片。", false);
            }

            await fetchCollections();
            prepareAdminForms();

            if (state.currentCollectionId && albumCollectionSelect) {
                albumCollectionSelect.value = state.currentCollectionId;
            }

            await refreshByRoute();

            if (!isAdminUser()) {
                try {
                    const { data: userData } = await supabaseClient.auth.getUser();
                    if (userData?.user && !albumDetailView.hidden) {
                        setStatus(albumPageStatus, "", false);
                    }
                } catch (error) {
                    console.error("读取用户状态失败：", error);
                }
            }
        } catch (error) {
            console.error("初始化相册失败：", error);
            setStatus(albumPageStatus, "数据读取失败，请稍后重试。", true);
            showNotFoundView();
            return;
        }

        if (!albumNotFound.hidden && state.collections.length > 0) {
            setStatus(albumPageStatus, "相册不存在或暂不可见。", true);
            return;
        }

        setStatus(albumPageStatus, "", false);
    }

    if (albumBackButton) {
        albumBackButton.addEventListener("click", () => {
            window.location.href = "./album.html";
        });
    }

    if (albumCollectionForm) {
        albumCollectionForm.addEventListener("submit", createCollection);
    }

    if (albumUploadForm) {
        albumUploadForm.addEventListener("submit", uploadPhoto);
    }

    if (albumCollectionEditForm) {
        albumCollectionEditForm.addEventListener("submit", saveCollectionEdit);
    }

    if (albumPhotoEditForm) {
        albumPhotoEditForm.addEventListener("submit", savePhotoEdit);
    }

    if (collectionCancelButton) {
        collectionCancelButton.addEventListener("click", () => {
            toggleModal(albumCollectionModal, false);
        });
    }

    if (photoCancelButton) {
        photoCancelButton.addEventListener("click", () => {
            toggleModal(albumPhotoModal, false);
        });
    }

    if (albumCollectionModal) {
        albumCollectionModal.addEventListener("click", (event) => {
            if (event.target === albumCollectionModal) {
                toggleModal(albumCollectionModal, false);
            }
        });
    }

    if (albumPhotoModal) {
        albumPhotoModal.addEventListener("click", (event) => {
            if (event.target === albumPhotoModal) {
                toggleModal(albumPhotoModal, false);
            }
        });
    }

    if (albumLightboxClose) {
        albumLightboxClose.addEventListener("click", closeLightbox);
    }

    if (albumLightboxPrev) {
        albumLightboxPrev.addEventListener("click", gotoPrevLightbox);
    }

    if (albumLightboxNext) {
        albumLightboxNext.addEventListener("click", gotoNextLightbox);
    }

    if (albumLightbox) {
        albumLightbox.addEventListener("click", (event) => {
            if (event.target === albumLightbox) {
                closeLightbox();
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            if (!albumPhotoModal.hidden) {
                toggleModal(albumPhotoModal, false);
                return;
            }
            if (!albumCollectionModal.hidden) {
                toggleModal(albumCollectionModal, false);
                return;
            }
            if (state.lightboxOpen) {
                closeLightbox();
            }
            return;
        }

        if (state.lightboxOpen && event.key === "ArrowLeft") {
            gotoPrevLightbox();
            return;
        }

        if (state.lightboxOpen && event.key === "ArrowRight") {
            gotoNextLightbox();
        }
    });

    initAlbum();
})();
