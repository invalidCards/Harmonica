import { Discord } from './deps.ts';
import { BotWrapper, Duration, PermissionFlags } from "./mod.ts";

/** The types that a command argument can have. Keep 1:1 with CommandArgument. */
type ArgumentType = 'string' | 'number' | 'boolean' | 'duration' | 'user' | 'role' | 'channel';
/** The types of arguments a command can have. */
export type CommandArgument = string | number | boolean | Duration | Discord.User | Discord.Role | Discord.GuildTextChannel;

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
    rest?: boolean,
    /** If defined, accepted values are only the ones entered in the array. Only works on string and number type arguments. Ignored if rest is set to true. */
    oneOf?: string[] | number[]
}

/** The basis for a command. All registered commands should be of this type. */
export interface Command<T extends CommandArgument[]> {
    /** The name of the command. Between 3 and 32 characters if using slash commands, unlimited otherwise. */
    name: string,
    /** The description of the command. Between 1 and 100 characters if using slash commands, unlimited otherwise. */
    description: string,
    /** The permissions that the bot must have in order to run the command. */
    botPermissions?: PermissionFlags[],
    /**
     * The permissions that the user must have in order to run the command.
     * Bot and guild owners can do everything regardless, though guild owners cannot run bot owner commands.
     */
    userPermissions?: 'BOT_OWNER' | 'GUILD_OWNER' | PermissionFlags[],
    /** The response that this should give if called through a slash command. */
    slashResponse?: Discord.InteractionResponse,
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
 * @param wrapper The bot wrapper
 * @param command The command to parse arguments for
 * @param args The raw arguments from the message
 * @param guild The guild that the command was called from. Undefined if called from a DM.
 */
export async function parseArguments(wrapper: BotWrapper, command: Command<CommandArgument[]>, args: string[], guild?: Discord.Guild): Promise<CommandArgument[] | undefined> {
    const ret: CommandArgument[] = [];
    if (!command.arguments || !command.arguments.length) return ret;
    if (command.arguments.filter(arg => !arg.optional).length && (!args || !args.length)) return undefined;
    let pointer = 0;
    for (const argumentDefinition of command.arguments) {
        if (!args[pointer]) break;
        switch (argumentDefinition.type) {
            case 'string': {
                if (argumentDefinition.rest) {
                    ret.push(args.slice(pointer).join(' '));
                } else {
                    if (argumentDefinition.oneOf && argumentDefinition.oneOf.length > 0 && isStringArray(argumentDefinition.oneOf)) {
                        if (!argumentDefinition.oneOf.includes(args[pointer])) return undefined;
                        ret.push(args[pointer]);
                    } else {
                        ret.push(args[pointer]);
                    }
                }
                break;
            }
            case 'number': {
                const number = parseFloat(args[pointer]);
                if (isNaN(number)) return undefined;
                if (argumentDefinition.oneOf && argumentDefinition.oneOf.length > 0 && isNumberArray(argumentDefinition.oneOf)) {
                    if (!argumentDefinition.oneOf.includes(number)) return undefined;
                    ret.push(number);
                } else {
                    ret.push(number);
                }
                break;
            }
            case 'boolean': {
                if (['true', 'yes', 'y', '1'].includes(args[pointer])) {
                    ret.push(true);
                } else if (['false', 'no', 'n', '0'].includes(args[pointer])) {
                    ret.push(false);
                } else {
                    return undefined;
                }
                break;
            }
            case 'duration': {
                const duration = Duration.parse(args[pointer]);
                if (!duration) return undefined;
                ret.push(duration);
                break;
            }
            case 'user': {
                const matchArray = args[pointer].match(/^<@!?(\d+)>$/);
                if (matchArray && matchArray.length > 1) {
                    const user = await wrapper.client.users.fetch(matchArray[1]);
                    ret.push(user);
                } else {
                    return undefined;
                }
                break;
            }
            case 'role': {
                if (!guild) return undefined;
                const matchArray = args[pointer].match(/^<@&(\d+)>$/);
                if (matchArray && matchArray.length > 1) {
                    const role = await guild.roles.get(matchArray[1]);
                    if (role) {
                        ret.push(role);
                    } else {
                        return undefined;
                    }
                } else {
                    return undefined;
                }
                break;
            }
            case 'channel': {
                if (!guild) return undefined;
                const matchArray = args[pointer].match(/^<#(\d+)>$/);
                if (matchArray && matchArray.length > 1) {
                    const channel = await guild.channels.get(matchArray[1]);
                    if (channel && channel instanceof Discord.GuildTextChannel) {
                        ret.push(channel);
                    } else {
                        return undefined;
                    }
                } else {
                    return undefined;
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
    message?: Discord.Message,
    /** The interaction generated after responding with the command's slashResponse. Undefined if called through normal means. */
    interaction?: Discord.Interaction
}

/**
 * Convert a local argument type to one that Discord can handle to register slash commands.
 * @param argumentType The local argument type
 */
export function getDiscordArgumentType(argumentType: ArgumentType): Discord.SlashCommandOptionType {
    switch (argumentType) {
        case 'number': return Discord.SlashCommandOptionType.INTEGER;
        case 'boolean': return Discord.SlashCommandOptionType.BOOLEAN;
        case 'user': return Discord.SlashCommandOptionType.USER;
        case 'channel': return Discord.SlashCommandOptionType.CHANNEL;
        case 'role': return Discord.SlashCommandOptionType.ROLE;
        default: return Discord.SlashCommandOptionType.STRING;
    }
}

function isStringArray(arr: unknown[]): arr is string[] {
    return arr.every(item => typeof item === 'string');
}

function isNumberArray(arr: unknown[]): arr is number[] {
    return arr.every(item => typeof item === 'number');
}
