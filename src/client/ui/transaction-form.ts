import { html, TemplateResult } from '../../../node_modules/lit-html/lit-html.js';
import { BlockchainNode, Transaction } from '../lib/blockchain-node.js';
import { Callback, Renderable, UI } from './common.js';


export class TransactionForm implements Renderable<Readonly<BlockchainNode>> {
  private transaction: Transaction = { sender: "", recipient: "",  amount: 0};

  constructor(readonly requestRendering: Callback) {
    this.resetForm();
  }

  render(node: Readonly<BlockchainNode>): TemplateResult {
    const { sender, recipient, amount } = this.transaction;
    const shouldDisableField = node.isMining || node.chainIsEmpty;

    return html`
      <h2>New transaction</h2>
      <form class="add-transaction-form" @submit=${(event: Event) => this.enqueueTransaction(event, node)}>
        ${UI.formField('sender',    sender,    this.onFieldChange, shouldDisableField)}<span class="hidden-xs">→</span>
        ${UI.formField('recipient', recipient, this.onFieldChange, shouldDisableField)}
        ${UI.formField('amount',    amount,    this.onFieldChange, shouldDisableField, 'number')}
        ${UI.button('ADD TRANSACTION', node.isMining || !this.formValid)}
      </form>
    `;
  }

  private get formValid(): boolean {
    return !!(
      this.transaction &&
      this.transaction.sender &&
      this.transaction.amount &&
      this.transaction.recipient
    );
  }

  private readonly onFieldChange = (event: Event) => {
    const { type, name, value } = event.target as HTMLInputElement;
    this.transaction[name] = type === 'number' ? parseInt(value) : value;
    this.requestRendering();
  };

  private enqueueTransaction(event: Event, node: Readonly<BlockchainNode>) {
    event.preventDefault();
    node.addTransaction(this.transaction);
    this.resetForm();
  }

  private resetForm() {
    this.transaction = { sender: "", recipient: "", amount: 0 };
    this.requestRendering();
  }
}