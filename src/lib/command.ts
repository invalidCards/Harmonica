import { Discord } from './deps.ts';
import { BotWrapper } from "./mod.ts";

/** The types that a command argument can have. Keep 1:1 with CommandArguments. */
export type ArgumentType = 'string' | 'number' | 'user';
/** The types of arguments a command can have. Keep 1:1 with ArgumentTypes. */
export type CommandArgument = string | number | Discord.User;

/** The definition of an argument of a command. Make sure that they are in the same order as the types in the Command<T> instance. */
export interface ArgumentDefinition {
    /** The name of the argument. Only used for display purposes. */
    name: string,
    /** The description of the argument. Only used for display purposes. */
    description: string,
    /** The type of the argument. Used to map input arguments to actual types. */
    type: ArgumentType,
    /** Whether or not this argument is optional. Multiple optional arguments can be defined, and will be handled in order of declaration. */
    optional?: boolean,
    /** If true, this argument gets the complete (unparsed) rest of the message as content. This only works on string-type arguments. */
    rest?: boolean
}

/** The basis for a command. All registered commands should be of this type. */
export interface Command<T extends CommandArgument[]> {
    /** The name of the command. Between 3 and 32 characters if using slash commands, unlimited otherwise. */
    name: string,
    /** The description of the command. Between 1 and 100 characters if using slash commands, unlimited otherwise. */
    description: string,
    /** The definition of the arguments that this command should take. */
    arguments?: ArgumentDefinition[],
    /** 
     * The code to execute when running the command.
     * @param wrapper The bot wrapper handling the command
     * @param args Arguments passed to the command
    */
    run: (wrapper: BotWrapper, data: CommandData, ...args: T) => void,
    /** The group this command belongs to. Don't implement in instances - this gets automatically set by the wrapper. */
    _group?: string
}

/**
 * Translates textual arguments to typed arguments depending on the command's argument definition.
 * @param command The command to parse arguments for
 * @param args The raw arguments from the message
 */
export async function parseArguments(wrapper: BotWrapper, command: Command<CommandArgument[]>, args: string[]): Promise<CommandArgument[] | undefined> {
    const ret: CommandArgument[] = [];
    if (!command.arguments || !command.arguments.length) return ret;
    if (command.arguments.filter(arg => !arg.optional).length && (!args || !args.length)) return undefined;
    let pointer = 0;
    for (const argumentDefinition of command.arguments) {
        if (!args[pointer]) break;
        switch (argumentDefinition.type) {
            case 'number': {
                if (isNaN(parseFloat(args[pointer]))) return undefined;
                ret.push(parseFloat(args[pointer]));
                break;
            }
            case 'user': {
                const matchArray = args[pointer].match(/^<@!(\d+)>$/);
                if (matchArray && matchArray.length > 1) {
                    ret.push(await wrapper.client.users.fetch(matchArray[1]));
                } else {
                    return undefined;
                }
                break;
            }
            case 'string': {
                if (argumentDefinition.rest) {
                    ret.push(args.slice(pointer).join(' '));
                } else {
                    ret.push(args[pointer]);
                }
                break;
            }
        }
        pointer++;
    }
    return ret;
}

/** Data that is passed to a command when run. */
export interface CommandData {
    /** Whether the command was called with a slash command. */
    viaSlash: boolean,
    /** The channel the command was called from. */
    channel: Discord.TextChannel,
    /** The Discord user that called the command. */
    user: Discord.User,
    /** The Discord user as guild member that called the command. Undefined if called from a DM. */
    member?: Discord.Member,
    /** The message used to call the command. Undefined if called through a slash command. */
    message?: Discord.Message
}
