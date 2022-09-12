import { useAppContext } from '@starkbot/discord-bot';
import {
  CommandInteraction,
  Client,
  ModalSubmitInteraction,
  SelectMenuInteraction,
  Role,
} from 'discord.js';

import { doc, setDoc } from 'firebase/firestore';
import { number } from 'starknet';
import { logger } from '../../configuration/logger';
import { formatRule } from './utils';

const DEFAULT_MIN_VALUE = 1;

export const addRuleCommandName = 'starkbot-add-rule';
export const addRuleRoleId = `${addRuleCommandName}-role`;
export const addRuleTokenAddressId = `${addRuleCommandName}-token-address`;
export const addRuleMinBalanceId = `${addRuleCommandName}-min-balance`;
export const addRuleMaxBalanceId = `${addRuleCommandName}-max-balance`;
export const addRuleNrOfNfts = `${addRuleCommandName}-number-of-nfts`;

const { ActionRowBuilder, SelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const cache = new Map<string, string>();

export async function addRuleCommand(client: Client, interaction: CommandInteraction) {
  await interaction.deferReply();
  const roleOptions = interaction.guild.roles.cache.map((role) => ({
    label: role.name,
    value: role.id,
  }));
  const row = new ActionRowBuilder().addComponents(
    new SelectMenuBuilder()
      .setCustomId(addRuleRoleId)
      .setPlaceholder('Select a role')
      .addOptions(roleOptions)
  );

  await interaction.followUp({
    content: 'Select the role you want to create a rule for:',
    components: [row],
  });
  return;
}

export async function handleAddRuleSelectRole(
  interaction: SelectMenuInteraction
) {
  const [selectedRoleId] = interaction.values;
  const selectedRole = interaction.guild.roles.cache.get(selectedRoleId);
  const modal = new ModalBuilder()
    .setCustomId(addRuleCommandName)
    .setTitle(`Add a rule for ${selectedRole.name}`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(addRuleTokenAddressId)
        .setLabel('Token contract address')
        .setStyle(TextInputStyle.Short)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(addRuleMinBalanceId)
        .setLabel(`Minimum balance (default ${DEFAULT_MIN_VALUE})`)
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(addRuleMaxBalanceId)
        .setLabel(`Maximum balance (default ${Number.MAX_SAFE_INTEGER})`)
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
    )
  );
  cache.set(interaction.member.user.id, selectedRoleId);
  await interaction.showModal(modal);
}

export async function handleAddRuleSubmitModal(interaction: ModalSubmitInteraction) {
  const selectedRoleId = cache.get(interaction.member.user.id);
  if (!selectedRoleId) {
    logger.warn('No role selected');
    await interaction.reply({
      content: 'No role selected',
    });
    return;
  }
  cache.delete(selectedRoleId);
  const selectedRole = interaction.guild.roles.cache.get(selectedRoleId);
  if (!selectedRole) {
    logger.warn('Role not found');
    await interaction.reply({
      content: 'Role not found',
    });
    return;
  }

  if (!(await addressValid(interaction))) return;
  if (!(await balancesValid(interaction))) return;

  const tokenAddress = getTokenAdress(interaction);
  const minBalance = getMinBalanceFrom(interaction);
  const maxBalance = getMaxBalanceFrom(interaction);

  const { rulesOfGuild } = useAppContext().firebase;
  let rule = doc(rulesOfGuild(interaction.guild.id))
  await setDoc(rule, {
    roleId: selectedRoleId,
    tokenAddress,
    minBalance,
    maxBalance,
  });

  await interaction.reply({
    content: `Created new rule: ${formatRule({
      role: selectedRole.name,
      tokenAddress,
      minBalance,
      maxBalance,
    })}`,
  });
}

async function addressValid(interaction: ModalSubmitInteraction): Promise<boolean> {
  const tokenAddress = getTokenAdress(interaction)
  if (tokenAddress == '') {
    logger.warn('No token address provided');
    await interaction.reply({
      content: '⚠️ No token address provided',
    });
    return false;
  }
  if (!number.isHex(tokenAddress)) {
    logger.warn('Token adress is not a valid hex string');
    await interaction.reply({
      content: '⚠️ Token address is not a valid hex string',
    });
    return false;
  }
  return true;
}


async function balancesValid(interaction: ModalSubmitInteraction): Promise<boolean> {
  const minBalance = getMinBalanceFrom(interaction)
  if (isNaN(minBalance) || minBalance < 1) {
    logger.warn('Wrong value for minimum balance, positive integer is required');
    await interaction.reply({
      content: 'Wrong value for minBalance',
    });
    return false;
  }

  const maxBalance = getMaxBalanceFrom(interaction);
  if (isNaN(maxBalance) || maxBalance < 0) {
    logger.warn('Wrong value for maximum balance, positive integer is required');
    await interaction.reply({
      content: 'Wrong value for maxBalance',
    });
    return false;
  }

  if (maxBalance < minBalance) {
    logger.warn('Maximum must be bigger than minimum');
    await interaction.reply({
      content: 'Min bigger than max',
    });
    return false;
  }
  return true;
}

function getTokenAdress(interaction: ModalSubmitInteraction): string {
  return interaction.fields.getTextInputValue(addRuleTokenAddressId);
}

function getMinBalanceFrom(interaction: ModalSubmitInteraction): number {
  let minBalanceInput =
    interaction.fields.getTextInputValue(addRuleMinBalanceId);
  if (!minBalanceInput) {
    minBalanceInput = `${DEFAULT_MIN_VALUE}`;
  }
  return parseInt(minBalanceInput);
}

function getMaxBalanceFrom(interaction: ModalSubmitInteraction): number {
  let maxBalanceInput =
    interaction.fields.getTextInputValue(addRuleMinBalanceId);
  if (!maxBalanceInput) {
    maxBalanceInput = `${Number.MAX_SAFE_INTEGER}`;
  }
  return parseInt(maxBalanceInput);
}

