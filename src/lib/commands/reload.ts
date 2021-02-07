import { Discord } from "../deps.ts";
import { BotWrapper, Command, CommandData } from "../mod.ts";

const command: Command<[]> = {
    name: 'reload',
    description: 'Reload all currently loaded commands.',
    userPermissions: 'BOT_OWNER',
    slashResponse: {type: Discord.InteractionResponseType.ACK_WITH_SOURCE},
    run: async (wrapper: BotWrapper, data: CommandData) => {
        const reply = await data.channel.send('🔄 Reloading commands...');
        await wrapper.registerCommands();
        if (wrapper.options.useSlashes) {
            await wrapper.registerSlashes();
        }
        await wrapper.registerEvents();
        reply.edit('✅ Commands reloaded!')
    }
}

export { command };
