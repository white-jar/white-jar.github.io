import { useEffect, useState } from "preact/hooks";
import { getPageview, incrementPageview } from "../lib/waline";

const PLACEHOLDER = "—";

export default function ViewCounter({ path, mode = "readonly" }) {
    const [count, setCount] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const fetcher = mode === "increment" ? incrementPageview : getPageview;

        fetcher(path).then((result) => {
            if (!cancelled) setCount(result);
        });

        return () => {
            cancelled = true;
        };
    }, [path, mode]);

    return <span class="view-counter">{count ?? PLACEHOLDER} 次瀏覽</span>;
}
