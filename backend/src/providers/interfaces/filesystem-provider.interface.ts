export interface FileMetadata {
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  modifiedAt: Date;
  createdAt?: Date;
}

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
  deleteFile(filePath: string): Promise<void>;
  readDir(dirPath: string): Promise<string[]>;
  createDir(dirPath: string): Promise<void>;
  deleteDir(dirPath: string): Promise<void>;
  copy(src: string, dest: string): Promise<void>;
  move(src: string, dest: string): Promise<void>;
  getMetadata(filePath: string): Promise<FileMetadata>;
  glob(pattern: string, cwd?: string): Promise<string[]>;
}
