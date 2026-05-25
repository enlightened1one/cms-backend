import { Module } from '@nestjs/common';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { MessagesModule } from '../messages/messages.module';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [MessagesModule, ActivitiesModule],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
