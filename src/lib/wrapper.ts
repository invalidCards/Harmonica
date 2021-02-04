import { Discord, path } from './deps.ts';
import { Command, CommandArgument, exists, parseArguments, getDiscordArgumentType } from './mod.ts';
import * as builtins from './commands/_builtins.ts';

export interface BotWrapperOptions {
    /** The token to log the bot in with. */
    token: string,
    /** The snowflake of the owner(s) of the bot. Use with caution! These people can bypass all permission checks. */
    owners: string[],
    /** The root path of the folder where all commands are kept. */
    commandPath: string,
    /** Whether or not to use slash commands. If false, defaults to prefix. */
    useSlashes: boolean,
    /** The prefix to use for non-slash commands. If undefined or empty, defaults to pings. */
    prefix?: string,
    /** A link to the support server of the bot, used to link the server in the help command. */
    supportLink?: string,
    /** If supportLink is set, use this to change the name shown in the help command. Defaults to "the support server". */
    supportTitle?: string,
    /** The hexadecimal color string that embeds created by this bot will use. Defaults to CSS's "Dodger Blue" #1E90FF. */
    themeColor?: string,
    /** Whether or not to register slash commands in the test guild as defined by the testGuildId. Does nothing if slashes are turned off. */
    useTestGuild?: boolean,
    /** The ID of the guild in which to test slash commands, if useTestGuild is true. Does nothing if slashes are turned off. */
    testGuildId?: string
}

/** The main bot wrapper, and the entry point for Harmonica bots. */
export class BotWrapper {
    private _client: Discord.Client;
    private _groups: Map<string, string>;
    private _commands: Map<string, Command<CommandArgument[]>>;

    /**
     * Create a new bot wrapper, which automatically creates a new client for you.
     * @param options The options for this wrapper.
     */
    constructor(public options: BotWrapperOptions) {
        this._client = new Discord.Client();
        this._groups = new Map<string, string>();
        this._commands = new Map<string, Command<CommandArgument[]>>();
    }

    get client() {
        return this._client;
    }

    get groups() {
        return this._groups;
    }

    get commands() {
        return this._commands;
    }

    /**
     * Register command groups and automatically import the commands from their respective .ts files.
     * @param groups Command groups to be registered, in the format [name, description].
     */
    async register(groups: string[][]) {
        if (groups.length) {
            for (const group of groups) {
                if (group[0] && group[1] && !['builtin'].includes(group[0])) {
                    this._groups.set(group[0], group[1]);
                } else {
                    console.error('Skipping group without name or description, or using a reserved group name.');
                    continue;
                }
            }
        }

        await this.registerCommands();
    }

    /** Do final internal registering things, and start the bot. */
    run() {
        this._client.on('messageCreate', (message) => {
            if (!this.options.useSlashes && !message.author.bot) {
                this.handleMessage(message);
            }
        });

        this._client.on('interactionCreate', (interaction) => {
            if (this.options.useSlashes && !interaction.user.bot && interaction.type === Discord.InteractionType.APPLICATION_COMMAND) {
                this.handleSlashInteraction(interaction);
            }
        });

        this._client.once('ready', () => {
            if (this.options.useSlashes) {
                this.registerSlashes();
            }
            console.log('Bot ready at ' + (new Date()).toUTCString());
        });

        this._client.connect(this.options.token, Discord.Intents.NonPrivileged);
    }

    /**
     * Get the prefix that is actually being used at the moment. For display purposes only.
     * @param guild (Optional) The guild to fetch the prefix for - returns the nickname for the bot (if one is set) if not undefined and no prefix is being used
     */
    async getEffectivePrefix(guild?: Discord.Guild): Promise<string> {
        if (this.options.useSlashes) {
            return '/';
        } else if (this.options.prefix) {
            return this.options.prefix;
        } else {
            if (guild) {
                const botUser = await guild.me();
                return '@' + (botUser.nick ? botUser.nick : botUser.user.username) + ' ';
            } else {
                return '@' + this._client.user?.username + ' ';
            }
        }
    }

    /**
     * Creates a standard baseline template with a title, a timestamp, the color set to the bot's theme color (if available), and an optional footer text.
     * @param title The title to be shown on the embed
     * @param footer The optional footer text to be added to the embed
     */
    getEmbedTemplate(title: string, footer?: string): Discord.Embed {
        const embed = new Discord.Embed({
            title: title
        }).setTimestamp(new Date()).setColor(this.options.themeColor || '#1E90FF');
        if (footer) {
            embed.setFooter(footer);
        }
        return embed;
    }

    /** Register commands as defined in the .ts files that are in the folders of the registered groups. */
    async registerCommands() {
        this._commands = new Map<string, Command<CommandArgument[]>>();
        this.registerBuiltins();

        for (const group of this._groups) {
            const groupPath = path.join(this.options.commandPath, group[0]);
            if (await exists(groupPath)) {
                for (const file of Deno.readDirSync(groupPath)) {
                    if (!file.isFile || !file.name.endsWith('.ts')) {
                        continue;
                    }
                    const mod = (await import('file:///' + path.join(groupPath, file.name + '#' + Math.random().toString()))).default;
                    let command;
                    try {
                        command = mod as Command<CommandArgument[]>;
                    } catch (error) {
                        console.error(error);
                        continue;
                    }
                    if (!command) {
                        continue;
                    }

                    if (this.isCommand(command.name)) {
                        console.error(`Command ${command.name} is being registered twice - skipping`);
                        continue;
                    }

                    const restArguments = command.arguments?.filter(arg => arg.rest);
                    if (restArguments && restArguments.length > 0) {
                        if (restArguments.length > 1) {
                            console.error(`Command ${command.name} registers more than one rest argument - skipping`);
                            continue;
                        }
                        if (restArguments[0].name !== command.arguments?.slice(-1)[0].name) {
                            console.error(`Command ${command.name} registers a non-last rest argument - skipping`);
                            continue;
                        }
                    }

                    command._group = group[0];
                    this._commands.set(command.name, command);
                }
            }
        }
    }

    /** Register builtin commands. These do not have a check whether the command already exists - these should always override manually registered commands. */
    private registerBuiltins() {
        this._groups.set('builtin', 'Built-in commands');
        this.registerBuiltin(builtins.reload.command);
        this.registerBuiltin(builtins.help.command as Command<CommandArgument[]>);
    }

    /**
     * Register a builtin command.
     * @param command The command to register as builtin
     */
    private registerBuiltin(command: Command<CommandArgument[]>) {
        command._group = 'builtin';
        this._commands.set(command.name, command);
    }

    /**
     * Check whether a command with the specified name is registered.
     * @param name The command to check
     */
    private isCommand(name: string): boolean {
        return this._commands.has(name);
    }

    /** Create a mention for this bot user. */
    private getBotMention(): string {
        if (this._client.user) {
            return this._client.user.nickMention;
        } else {
            return '';
        }
    }

    /** Handle message events by trying to resolve them to commands. */
    private async handleMessage(message: Discord.Message) {
        if (this.options.prefix && !message.content.startsWith(this.options.prefix)) {
            return; //TODO expose as message event
        }

        if (!this.options.prefix && !message.content.startsWith(this.getBotMention())) {
            return; //TODO expose as message event
        }

        let workingContent = message.content;
        if (this.options.prefix) {
            workingContent = workingContent.replace(this.options.prefix, '');
        } else {
            workingContent = workingContent.replace(this.getBotMention(), '');
        }
        workingContent = workingContent.replace(/\s+/g, ' ').trim();

        const [cmd, ...args] = workingContent.split(' ');
        if (this.isCommand(cmd)) {
            const actualCommand = this._commands.get(cmd);
            if (actualCommand) {
                if (actualCommand.botPermissions && actualCommand.botPermissions.length > 0 && message.guild) {
                    const guildChannel = await message.guild.channels.get(message.channelID) as Discord.GuildTextChannel | undefined;
                    if (guildChannel && !(await guildChannel.permissionsFor(this._client.user?.id as string)).has(actualCommand.botPermissions)) {
                        message.channel.send(`The bot is missing permissions to run this command. Contact your server administrator to have them changed.\nRequired permissions: ${actualCommand.botPermissions.join(', ')}`);
                        return;
                    }
                }

                if (actualCommand.userPermissions && !this.options.owners.includes(message.author.id)) {
                    if ((actualCommand.userPermissions === 'BOT_OWNER') ||
                        (actualCommand.userPermissions === 'GUILD_OWNER' && message.guild && message.guild.ownerID !== message.author.id)) {
                        message.channel.send(`You lack the permissions required to execute this command.`);
                        return;
                    } else {
                        if (actualCommand.userPermissions.length > 0 && message.guild) {
                            const guildChannel = await message.guild.channels.get(message.channelID) as Discord.GuildTextChannel | undefined;
                            if (guildChannel && !(await guildChannel.permissionsFor(message.author.id)).has(actualCommand.userPermissions)) {
                                message.channel.send(`You lack the permissions required to execute this command. (Permission check executed)`);
                                return;
                            }
                        }
                    }
                }

                const parsedArguments = await parseArguments(this, actualCommand, args, message.guild);
                if (parsedArguments) {
                    actualCommand.run(this, {viaSlash: false, channel: message.channel, user: message.author, member: message.member, message: message}, ...parsedArguments);
                } else {
                    const effectivePrefix = await this.getEffectivePrefix(message.guild);
                    message.channel.send(`Incorrect arguments. Make sure you\'re calling the command correctly.\nUse \`${effectivePrefix}help ${actualCommand.name}\` for more information.`);
                }
            }
        }
    }

    /** Register slash commands to Discord, so that they may be used. */
    async registerSlashes() {
        let registeredCommands: Discord.Collection<string, Discord.SlashCommand>;
        if (this.options.useTestGuild && this.options.testGuildId)
        {
            registeredCommands = await this._client.slash.commands.guild(this.options.testGuildId);
        } else {
            registeredCommands = await this._client.slash.commands.all();
        }

        if (!registeredCommands) return;

        for (const registeredCommand of registeredCommands.keys()) {
            if (!this._commands.has(registeredCommand)) {
                this._client.slash.commands.delete(registeredCommand, this.options.useTestGuild ? this.options.testGuildId : undefined);
            }
        }

        for (const localCommand of this._commands.values()) {
            const slashCommandDefinition: Discord.SlashCommandPartial = {
                name: localCommand.name,
                description: localCommand.description
            };

            if (localCommand.arguments && localCommand.arguments.length > 0) {
                if (!slashCommandDefinition.options) slashCommandDefinition.options = [];
                for (const argument of localCommand.arguments) {
                    const slashCommandOption: Discord.SlashCommandOption = {
                        name: argument.name,
                        description: argument.description,
                        type: getDiscordArgumentType(argument.type),
                        required: !argument.optional
                    };
                    if (argument.oneOf && argument.oneOf.length > 0) {
                        if (!slashCommandOption.choices) slashCommandOption.choices = [];
                        for (const option of argument.oneOf) {
                            slashCommandOption.choices.push({name: option.toString(), value: option});
                        }
                    }
                    slashCommandDefinition.options.push(slashCommandOption);
                }
            }
            this._client.slash.commands.create(slashCommandDefinition, this.options.useTestGuild ? this.options.testGuildId : undefined);
        }
    }

    /**
     * Handle an incoming slash interaction.
     * @param interaction The incoming interaction
     */
    private async handleSlashInteraction(interaction: Discord.Interaction) {
        const localCommand = this._commands.get(interaction.name);
        if (!localCommand) {
            return;
        }

        if (localCommand.botPermissions && localCommand.botPermissions.length > 0) {
            if (!(await interaction.channel.permissionsFor(this._client.user?.id as string)).has(localCommand.botPermissions)) {
                interaction.respond({type: Discord.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    content: `The bot is missing permissions to run this command. Contact your server administrator to have them changed.\nRequired permissions: ${localCommand.botPermissions.join(', ')}`});
                return;
            }
        }

        if (localCommand.userPermissions && !this.options.owners.includes(interaction.user.id)) {
            if ((localCommand.userPermissions === 'BOT_OWNER') ||
                (localCommand.userPermissions === 'GUILD_OWNER' && interaction.guild.ownerID !== interaction.user.id) ||
                (localCommand.userPermissions.length > 0 && !(await interaction.channel.permissionsFor(interaction.user.id)).has(localCommand.userPermissions))) {
                await interaction.respond({type: Discord.InteractionResponseType.ACKNOWLEDGE});
                (await interaction.user.createDM()).send(`You lack the permissions required to execute this command.`);
                return;
            }
        }

        const rawArgs: string[] = [];
        let cmdArgumentCounter = 0;
        for (const argument of interaction.options) {
            if (localCommand.arguments && localCommand.arguments[cmdArgumentCounter]) {
                switch (localCommand.arguments[cmdArgumentCounter].type) {
                    case 'user': rawArgs.push(`<@!${argument.value.toString()}>`); break;
                    case 'channel': rawArgs.push(`<#${argument.value.toString()}>`); break;
                    case 'role': rawArgs.push(`<@&${argument.value.toString()}`); break;
                    default: rawArgs.push(argument.value.toString());
                }
            }
            cmdArgumentCounter++;
        }

        const parsedArguments = await parseArguments(this, localCommand, rawArgs, interaction.guild);
        if (parsedArguments) {
            const newInteraction = await interaction.respond(localCommand.slashResponse);
            localCommand.run(this, {viaSlash: true, channel: interaction.channel, user: interaction.user, member: interaction.member, interaction: newInteraction}, ...parsedArguments);
        } else {
            await interaction.respond({type: Discord.InteractionResponseType.ACKNOWLEDGE});
            (await interaction.user.createDM()).send('Something went wrong processing your slash command. Try again later, or contact the bot owner if the problem persists.');
        }
    }
}
