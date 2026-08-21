/**
 * Mengubah string menjadi format Sentence case (huruf pertama kapital, sisanya huruf kecil)
 * serta membersihkan whitespace berlebih.
 * Contoh: "ELEKTRONIK" -> "Elektronik", "alat tulis kantor" -> "Alat tulis kantor"
 *
 * @param {string} str - String input
 * @returns {string} - String dalam format sentence case
 */
export const toSentenceCase = (str) => {
    if (!str || typeof str !== 'string') return '';
    const cleaned = str.trim().replace(/\s+/g, ' ');
    if (!cleaned) return '';
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
};
