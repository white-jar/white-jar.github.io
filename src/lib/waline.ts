const SERVER_URL = import.meta.env.PUBLIC_WALINE_SERVER_URL;

function articleBaseUrl(): string | null {
    if (!SERVER_URL) return null;
    return `${SERVER_URL.replace(/\/$/, "")}/api/article`;
}

/** 唯讀查詢單一文章的瀏覽次數，失敗時回傳 null。 */
export async function getPageview(path: string): Promise<number | null> {
    const counts = await getPageviews([path]);
    return counts?.[0] ?? null;
}

/** 唯讀批次查詢多篇文章的瀏覽次數，失敗時回傳 null；順序對應傳入的 paths。 */
export async function getPageviews(
    paths: string[],
): Promise<number[] | null> {
    if (paths.length === 0) return [];
    const base = articleBaseUrl();
    if (!base) return null;
    const url = `${base}?path=${paths.map(encodeURIComponent).join(",")}`;

    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const body = await res.json();
        if (body.errno !== 0 || !Array.isArray(body.data)) return null;
        return body.data.map((entry: { time?: number }) => entry.time ?? 0);
    } catch {
        return null;
    }
}

/** 讀取並累加單一文章的瀏覽次數（+1），回傳累加後的次數；失敗時回傳 null。 */
export async function incrementPageview(path: string): Promise<number | null> {
    const url = articleBaseUrl();
    if (!url) return null;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path, type: "time", action: "inc" }),
        });
        if (!res.ok) return null;
        const body = await res.json();
        if (body.errno !== 0 || !Array.isArray(body.data)) return null;
        return body.data[0]?.time ?? null;
    } catch {
        return null;
    }
}
