export interface IFileSystemProvider {
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  mkdir(dirPath: string): Promise<void>;
  readdir(dirPath: string): Promise<string[]>;
  unlink(filePath: string): Promise<void>;
  stat(
    filePath: string,
  ): Promise<{ size: number; isDirectory: boolean; modifiedAt: Date }>;
}
