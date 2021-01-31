import { BotWrapper, Command, CommandData } from '../mod.ts';

const command: Command<[string]> = {
    name: 'help',
    description: 'Get a list of commands or details on a specific command.',
    arguments: [{
        name: 'command',
        description: 'The command to get details on',
        type: 'string',
        optional: true
    }],
    run: async (wrapper: BotWrapper, data: CommandData, command?: string) => {
        if (command) {
            if (wrapper.commands.has(command)) {
                const detailCmd = wrapper.commands.get(command);
                if (!detailCmd) return; //how

                const embed = wrapper.getEmbedTemplate(detailCmd.name, wrapper.groups.get(detailCmd._group || '')).setDescription(detailCmd.description);

                if (detailCmd.arguments && detailCmd.arguments.length > 0) {
                    let fieldContent = '';
                    for (const argument of detailCmd.arguments) {
                        fieldContent += `\n\`${argument.name}\` (${argument.type}) - ${argument.optional ? '*[Optional]* ' : ''}${argument.description}`;
                        if (argument.oneOf && argument.oneOf.length) {
                            fieldContent += `\n⤷ Options: ${argument.oneOf.join(', ')}`;
                        }
                    }
                    if (fieldContent !== '') {
                        embed.addField({name: 'Arguments', value: fieldContent.trim()});
                    }
                }

                data.channel.send(embed);
            }
        } else {
            const groups = Array.from(wrapper.groups.keys()).filter(group => group !== 'builtin').sort((a,b) => a.localeCompare(b));
            groups.push('builtin');

            const effectivePrefix = await wrapper.getEffectivePrefix();

            const embed = wrapper.getEmbedTemplate('__Available commands__', `${effectivePrefix}help command for details`);
            if (wrapper.options.supportLink) {
                embed.setDescription(`Need help, or have questions or comments? Join [${wrapper.options.supportTitle || 'the support server'}](${wrapper.options.supportLink})!`);
            }

            for (const group of groups) {
                let fieldContent = '';
                for (const groupCmd of Array.from(wrapper.commands.values()).filter(cmd => cmd._group === group).sort((a,b) => a.name.localeCompare(b.name))) {
                    fieldContent += `\n\`${effectivePrefix}${groupCmd.name}\` - ${groupCmd.description}`;
                }
                if (fieldContent !== '') {
                    embed.addField({name: wrapper.groups.get(group) as string, value: fieldContent.trim()});
                }
            }

            data.channel.send(embed);
        }
    }
}

export { command };
