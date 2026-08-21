// utils/pagination.js
// Helper terpusat untuk pagination berbasis LIMIT/OFFSET.
// Dipakai oleh controller Item, Transaction, dan ItemReport supaya
// query param & response shape-nya konsisten di semua endpoint.

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 150; // batas atas, cegah client minta limit melebihi 150 data

/**
 * Ambil & validasi { page, limit } dari req.query.
 * - page/limit yang tidak valid (bukan integer positif) fallback ke default.
 * - limit di-cap ke MAX_LIMIT supaya tidak ada yang bisa minta seluruh tabel sekaligus.
 */
export const parsePagination = (query = {}, options = {}) => {
    const defaultLimit = options.defaultLimit || DEFAULT_LIMIT;
    const maxLimit = options.maxLimit || MAX_LIMIT;

    let page = parseInt(query.page, 10);
    let limit = parseInt(query.limit, 10);

    if (!Number.isInteger(page) || page < 1) page = 1;
    if (!Number.isInteger(limit) || limit < 1) limit = defaultLimit;
    if (limit > maxLimit) limit = maxLimit;

    const offset = (page - 1) * limit;

    return { page, limit, offset };
};

/**
 * Bangun metadata pagination untuk dikirim di response JSON.
 */
export const buildPaginationMeta = (page, limit, total) => ({
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});