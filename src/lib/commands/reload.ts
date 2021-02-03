import { BotWrapper, Command, CommandData } from "../mod.ts";

const command: Command<[]> = {
    name: 'reload',
    description: 'Reload all currently loaded commands.',
    userPermissions: 'BOT_OWNER',
    run: async (wrapper: BotWrapper, data: CommandData) => {
        const reply = await data.channel.send('🔄 Reloading commands...');
        await wrapper.registerCommands();
        reply.edit('✅ Commands reloaded!')
    }
}

export { command };
