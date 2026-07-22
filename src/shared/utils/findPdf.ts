import * as fs from 'fs';
import * as path from 'path';

export function findPdf(baseDir: string, partialName: string): string | null {
    const searchLog: {
        baseDir: string;
        partialName: string;
        startTime: string;
        filesChecked: Array<{ filename: string; matches: boolean }>;
        directoriesSearched: string[];
    } = {
        baseDir,
        partialName,
        startTime: new Date().toISOString(),
        filesChecked: [],
        directoriesSearched: [],
    };

    function search(dir: string): string | null {
        try {
            searchLog.directoriesSearched.push(dir);
            const items = fs.readdirSync(dir, { withFileTypes: true });

            for (const item of items) {
                const fullPath = path.join(dir, item.name);

                if (item.isDirectory()) {
                    const result = search(fullPath);
                    if (result) return result;
                }

                if (item.isFile() && item.name.toLowerCase().endsWith('.pdf')) {
                    searchLog.filesChecked.push({
                        filename: item.name,
                        matches: item.name.toLowerCase().includes(partialName.toLowerCase()),
                    });

                    if (item.name.toLowerCase().includes(partialName.toLowerCase())) {
                        return fullPath;
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('[findPdf] Erro durante busca:', {
                ...searchLog,
                error: error.message,
                currentDir: dir,
            });
            return null;
        }
    }

    const result = search(baseDir);   

    return result;
}
