declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PrismaJson {
    type fileMeta = {
      size: number;
      name: string;
      mime: string;
      hash: string;
    };
    type imageMeta = {
      size: number;
      name: string;
      mime: string;
      hash: string;
      height: number;
      width: number;
      thumbnail: string;
    };
    type audioMeta = {
      size: number;
      name: string;
      mime: string;
      hash: string;
      duration: number;
    };
    type videoMeta = {
      size: number;
      name: string;
      mime: string;
      hash: string;
      duration: number;
      height: number;
      width: number;
      thumbnail: string;
    };

    type metaType = imageMeta | videoMeta | audioMeta | fileMeta;
  }
}
export {};
