

export const truncateText = (text: string, length: number) => {
    if (!length || !text || text.length <= length) {
        return text;
    }
    if (text.length <= length) {
        return text;
    }
    const leftChars = Math.ceil(length/2);
    const rightChars = Math.floor(length/2);
    return text.substring(0, leftChars) + '...' + text.substring(text.length - rightChars);
}

export const copyToCliboard = async (text: string) => {
    if (text) {
        navigator.clipboard.writeText(text);
    }
};