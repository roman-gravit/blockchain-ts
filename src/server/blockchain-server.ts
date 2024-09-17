import * as WebSocket from "ws";
import { Message, MessageTypes, UUID } from "../shared/messages";
import { MessageServer } from "./message-server";

type Replies = Map<WebSocket, Message>;

export class BlockchainServer extends MessageServer<Message> {
    private readonly receivedMessagesAwaitingResponse = new Map<UUID, WebSocket>();

    private readonly sentMessagesAwaitingReply = new Map<UUID, Replies>(); // Used as accumulator for replies from clients.

    protected handleMessage(sender: WebSocket, message: Message): void {
        switch (message.type) {
            case MessageTypes.GetLongestChainRequest : return this.handleGetLongestChainRequest(sender, message);
            case MessageTypes.GetLongestChainResponse: return this.handleGetLongestChainResponse(sender, message);
            case MessageTypes.NewBlockRequest        : return this.handleAddTransactionsRequest(sender, message);
            case MessageTypes.NewBlockAnnouncement   : return this.handleNewBlockAnnouncement(sender, message);
            default: {
                console.log(`Received message of unknown type: "${message.type}"`);
            }
        }
    }

    private handleGetLongestChainRequest(requestor: WebSocket, message: Message): void {
        // If there are other nodes in the network ask them about their chains.
        // Otherwise immediately reply to the requestor with an empty array.

        if (this.clientIsNotAlone) {
            this.receivedMessagesAwaitingResponse.set(message.correlationId, requestor);
            this.sentMessagesAwaitingReply.set(message.correlationId, new Map()); // Map accumulates replies from clients
            this.broadcastExcept(requestor, message);
        } else {
            this.replyTo(requestor, {
                type: MessageTypes.GetLongestChainResponse,
                correlationId: message.correlationId,
                payload: []
            });
        }
    }

    private handleGetLongestChainResponse(sender: WebSocket, message: Message): void {
        if (this.receivedMessagesAwaitingResponse.has(message.correlationId)) {
            const requestor = this.receivedMessagesAwaitingResponse.get(message.correlationId);

            if (this.everyoneReplied(sender, message)) {
                const replies = this.sentMessagesAwaitingReply.get(message.correlationId);
                if(replies) {
                    const allReplies = replies.values();
                    const longestChain = Array.from(allReplies).reduce(this.selectTheLongestChain);
                    if(requestor) {
                        this.replyTo(requestor, longestChain);
                    }
                }
            }
        }
    }

    private handleAddTransactionsRequest(requestor: WebSocket, message: Message): void {
        this.broadcastExcept(requestor, message);
    }

    private handleNewBlockAnnouncement(requestor: WebSocket, message: Message): void {
        this.broadcastExcept(requestor, message);
    }

    // NOTE: naive implementation that assumes no clients added or removed after the server requested the longest chain.
    // Otherwise the server may await a reply from a client that has never received the request.
    private everyoneReplied(sender: WebSocket, message: Message): boolean {
        const getRepliedClients = this.sentMessagesAwaitingReply.get(message.correlationId || "");
        if(!getRepliedClients) {
            return false;
        }

        const setClients = getRepliedClients.set(sender, message);
        const awaitingForClients = Array.from(this.clients).filter(c => !setClients.has(c));
        return awaitingForClients.length === 1; // 1 - the one who requested.
    }

    private selectTheLongestChain(currentlyLongest: Message, current: Message, index: number) {
        return index > 0 && current.payload.length > currentlyLongest.payload.length ? current : currentlyLongest;
    }

    private get clientIsNotAlone(): boolean {
        return this.clients.size > 1;
    }
}


/*
import * as WebSocket from 'ws';
import { Message, MessageTypes, UUID } from '../shared/messages';
import { MessageServer } from './message-server';

export class BlockchainServer extends MessageServer<Message> {
  private readonly receivedMessagesAwaitingResponse = new Map<UUID, WebSocket>();

  protected handleMessage(sender: WebSocket, message: Message): void {
    switch (message.type) {
      case MessageTypes.GetLongestChainRequest : return this.handleGetLongestChainRequest(sender, message);
      case MessageTypes.GetLongestChainResponse: return this.handleGetLongestChainResponse(message);
      case MessageTypes.NewBlockRequest        : return this.handleNewBlockRequest(sender, message);
      case MessageTypes.NewBlockAnnouncement   : return this.handleNewBlockAnnouncement(sender, message);
      default: {
        console.log(`Received message of unknown type: "${message.type}"`);
      }
    }
  }

  private handleGetLongestChainRequest(requestor: WebSocket, message: Message): void {
    // If there are other nodes in the network ask them about their chains.
    // Otherwise immediately reply to the requestor with an empty array.

    if (this.clientIsNotAlone) {
      this.receivedMessagesAwaitingResponse.set(message.correlationId, requestor);
      this.broadcastExcept(requestor, message);
    } else {
      this.replyTo(requestor, {
        type: MessageTypes.GetLongestChainResponse,
        correlationId: message.correlationId,
        payload: []
      });
    }
  }

  private handleGetLongestChainResponse(message: Message): void {

    if (this.receivedMessagesAwaitingResponse.has(message.correlationId)) {
      const requestor = this.receivedMessagesAwaitingResponse.get(message.correlationId);
      this.replyTo(requestor, message);
    }
  }

  private handleNewBlockRequest(requestor: WebSocket, message: Message): void {
    this.broadcastExcept(requestor, message);
  }

  private handleNewBlockAnnouncement(requestor: WebSocket, message: Message): void {
    this.broadcastExcept(requestor, message);
  }

  private get clientIsNotAlone(): boolean {
    return this.clients.size > 1;
  }
}
*/