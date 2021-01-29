/**
 * Checks if a file or folder exists, without having to use the unstable fs Deno library.
 * @param filename The file or directory to check the existence of
 */
export const exists = async (filename: string): Promise<boolean> => {
    try {
        await Deno.stat(filename);
        // successful, file or directory must exist
        return true;
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
        // file or directory does not exist
        return false;
        } else {
        // unexpected error, maybe permissions, pass it along
        throw error;
        }
    }
};

/**
 * Return an enum by the string value associated with it.
 * @param val The value to parse to an enum
 * @param _enum The enum to parse the value of
 * @see https://stackoverflow.com/a/62812933/9381422
 */
export const enumFromValue = <T extends Record<string, string>>(val: string, _enum: T) => {
    const enumName = (Object.keys(_enum) as Array<keyof T>).find(k => _enum[k] === val);
    if (!enumName) return undefined;
    return _enum[enumName];
}
