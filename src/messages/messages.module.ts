import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';

/**
 * MessagesModule does not have its own controller.
 * Message endpoints are nested under /complaints/:id/messages
 * and handled directly by ComplaintsController.
 */
@Module({
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
