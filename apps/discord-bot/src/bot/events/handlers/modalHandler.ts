import { logger } from "apps/discord-bot/src/logger";
import { ModalSubmitInteraction } from "discord.js";
import { addRuleCommandName, handleAddRuleSubmitModal } from "../../commands/addRule";

export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
    switch (interaction.customId) {
        case addRuleCommandName:
            await handleAddRuleSubmitModal(interaction);
            return;
        default:
            logger.warn(`Modal for "${interaction.customId}" isn't supported yet`)
    }
}