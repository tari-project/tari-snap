const fs = require('fs-extra');
const path = require('path');

const SOURCE_BASE_PATH = path.join(
    __dirname,
    '../../../tari_wallet_lib/pkg',
);

const INDEX_FILENAME = 'index.js';

const FILENAMES = [
    INDEX_FILENAME,
    'index_bg.wasm',
    'index_bg.wasm.d.ts',
    'index.d.ts',
];

const TARGET_BASE_PATH = path.join(
    __dirname,
    '../src/tari_wallet_lib',
);

function fixIndexFile() {
    const indexFilePath = path.join(
        TARGET_BASE_PATH,
        INDEX_FILENAME,
    );
    var content = fs.readFileSync(indexFilePath, 'utf-8');
    var newContent = content.replace('import.meta.url', '""');
    fs.writeFileSync(indexFilePath, newContent, 'utf-8');
}

async function main() {
    // remove existing target folder and recreate it again
    fs.removeSync(TARGET_BASE_PATH);
    await fs.ensureDir(TARGET_BASE_PATH);

    // copy each file from the source folder to the target one
    FILENAMES.forEach((filename) => {
        const source = path.join(
            SOURCE_BASE_PATH,
            filename,
        );
        const target = path.join(
            TARGET_BASE_PATH,
            filename,
        );
        fs.copySync(source, target);
    });

    // Metamask Snap's SES environment does not like certain values
    fixIndexFile();
}

main();