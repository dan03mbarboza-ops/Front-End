const API_URL = "http://127.0.0.1:5000/livros";
const panels = document.querySelectorAll("[data-view-panel]");
const links = document.querySelectorAll("[data-view]");
const list = document.querySelector("#library-list");
const count = document.querySelector("#book-count");
const toast = document.querySelector("#toast");
const deleteModal = document.querySelector("#delete-modal");
const deleteMessage = document.querySelector("#modal-message");
const confirmDeleteButton = document.querySelector("#confirm-delete");
let toastTimer;
let pendingDeleteId = null;

function notify(message, error = false) {
    toast.textContent = message;
    toast.className = `toast show${error ? " error" : ""}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.className = "toast"), 3500);
}
function escapeHtml(value) {
    const node = document.createElement("span");
    node.textContent = value ?? "";
    return node.innerHTML;
}
function card(book, removable = false) {
    return `<article class="book-card"><span class="book-id">#${book.id}</span>${removable ? `<button class="remove" data-delete-id="${book.id}" aria-label="Excluir ${escapeHtml(book.titulo)}">Excluir</button>` : ""}<h2>${escapeHtml(book.titulo)}</h2><p>${escapeHtml(book.autor)} · ${escapeHtml(book.genero)}</p></article>`;
}
function openDeleteModal(id, title) {
    pendingDeleteId = id;
    deleteMessage.textContent = `“${title}” será removido do acervo permanentemente.`;
    deleteModal.hidden = false;
    confirmDeleteButton.focus();
}
function closeDeleteModal() {
    deleteModal.hidden = true;
    pendingDeleteId = null;
}
function showView(view) {
    panels.forEach(
        (panel) => (panel.hidden = panel.dataset.viewPanel !== view),
    );
    links.forEach((link) =>
        link.classList.toggle("active", link.dataset.view === view),
    );
    if (view === "acervo") loadBooks();
}
async function responseJson(response) {
    const data = await response.json().catch(() => null);
    if (!response.ok)
        throw new Error(
            typeof data === "string"
                ? data
                : data?.message || `Erro ${response.status}`,
        );
    return data;
}
async function loadBooks() {
    list.innerHTML = '<div class="empty"><p>Carregando acervo...</p></div>';
    try {
        const books = await fetch(API_URL).then(responseJson);
        count.textContent = books.length;
        list.innerHTML = books.length
            ? books.map((book) => card(book, true)).join("")
            : '<div class="empty"><strong>Acervo vazio</strong><p>Cadastre o primeiro livro via <b>POST /livros</b></p></div>';
    } catch (error) {
        count.textContent = "—";
        list.innerHTML =
            '<div class="empty"><strong>Não foi possível carregar</strong><p>Verifique se a API está ativa em 127.0.0.1:5000.</p></div>';
        notify(error.message, true);
    }
}
async function deleteBook(id) {
    try {
        await fetch(`${API_URL}/${id}`, { method: "DELETE" }).then(
            responseJson,
        );
        notify("Livro excluído com sucesso.");
        loadBooks();
    } catch (error) {
        notify(error.message, true);
    }
}
links.forEach((link) =>
    link.addEventListener("click", (event) => {
        event.preventDefault();
        const view = link.dataset.view;
        history.replaceState(null, "", `#${view}`);
        showView(view);
    }),
);
document.querySelector("#refresh-button").addEventListener("click", loadBooks);
list.addEventListener("click", (event) => {
    const id = event.target.dataset.deleteId;
    if (id) {
        const title = event.target.closest(".book-card").querySelector("h2").textContent;
        openDeleteModal(id, title);
    }
});
document.querySelector("#cancel-delete").addEventListener("click", closeDeleteModal);
deleteModal.addEventListener("click", (event) => {
    if (event.target === deleteModal) closeDeleteModal();
});
confirmDeleteButton.addEventListener("click", async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    closeDeleteModal();
    await deleteBook(id);
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !deleteModal.hidden) closeDeleteModal();
});
document
    .querySelector("#book-form")
    .addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form));
        try {
            const book = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }).then(responseJson);
            form.reset();
            notify(`“${book.titulo}” foi cadastrado.`);
            history.replaceState(null, "", "#acervo");
            showView("acervo");
        } catch (error) {
            notify(error.message, true);
        }
    });
document
    .querySelector("#search-form")
    .addEventListener("submit", async (event) => {
        event.preventDefault();
        const type = document.querySelector("#search-type").value;
        const term = document.querySelector("#search-term").value.trim();
        const result = document.querySelector("#search-result");
        result.innerHTML = "";
        try {
            const books = await fetch(API_URL).then(responseJson);
            const normalizedTerm = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const matches = books.filter((book) => {
                const fields = type === "all" ? [book.id, book.titulo, book.autor, book.genero] : [book[type]];
                return fields.some((field) => String(field).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalizedTerm));
            });
            result.innerHTML = matches.length
                ? matches.map((book) => card(book)).join("")
                : '<p class="hint">Nenhum livro encontrado para esta pesquisa.</p>';
        } catch (error) {
            result.innerHTML =
                '<p class="hint">Não foi possível realizar a pesquisa.</p>';
            notify(error.message, true);
        }
    });
const initialView = location.hash.slice(1);
showView(
    ["acervo", "cadastrar", "pesquisar"].includes(initialView)
        ? initialView
        : "acervo",
);
