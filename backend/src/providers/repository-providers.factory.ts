import { Provider } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongooseRepository } from './adapters/mongoose-repository.adapter';

export function createRepositoryProvider(
  token: symbol,
  schemaName: string,
): Provider {
  return {
    provide: token,
    useFactory: (model: Model<any>) => new MongooseRepository(model),
    inject: [getModelToken(schemaName)],
  };
}
