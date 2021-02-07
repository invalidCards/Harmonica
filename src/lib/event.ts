import { Discord } from './deps.ts';
import { BotWrapper, Command, CommandArgument } from './mod.ts';

export enum EventTypes {
    CMD_BOT_MISSING_PERMISSION,
    CMD_INCORRECT_ARGUMENTS,
    CMD_USER_MISSING_PERMISSION,
    MESSAGE,
}

export interface EventData {
    command?: Command<CommandArgument[]>,
    commandArgumentsRaw?: CommandArgument[],
    message?: Discord.Message,
}

export interface BotEvent {
    name: string,
    triggers: EventTypes[],
    run: (wrapper: BotWrapper, data: EventData) => void
}