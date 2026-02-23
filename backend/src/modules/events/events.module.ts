import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { DEFAULT_JWT_SECRET } from '../auth/auth.constants';

@Module({
  imports: [
    JwtModule.register({
      secret: DEFAULT_JWT_SECRET,
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
