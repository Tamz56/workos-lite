import ArticleStudioClient from "./ArticleStudioClient";
import { Suspense } from "react";

export default function ArticleStudioPage() {
    return (
        <Suspense fallback={<div>Loading Article Studio...</div>}>
            <ArticleStudioClient />
        </Suspense>
    );
}
