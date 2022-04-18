import { EAction } from './app_context';
import { LOG, LOG_WARN } from './util';

export type StatusType = 'warning' | 'info';

export type StatusMessage = {
    status: StatusType,
    message: string,
}

export class StatusHandler {
    /** Singleton accessor */
    private static _instance: StatusHandler;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }
    
    private _statusMessages: StatusMessage[];

    private constructor() {
        this._statusMessages = [];
    }

    public clear() {
        this._statusMessages = [];
    }

    public add(status: StatusType, message: string) {
        (status === 'warning' ? LOG_WARN : LOG)(message);
        this._statusMessages.push({ status: status, message: message });
    }

    public hasStatusMessages(statusType: StatusType): boolean {
        return this.getStatusMessages(statusType).length > 0;
    }

    public getStatusMessages(statusType: StatusType): string[] {
        const messagesToReturn = (statusType !== undefined) ? this._statusMessages.filter((m) => m.status === statusType ): this._statusMessages;
        return messagesToReturn.map((m) => m.message);
    }

    public getDefaultSuccessMessage(action: EAction): string {
        switch (action) {
            case EAction.Import:
                return '导入 Mesh 成功';
            case EAction.Simplify:
                return '简化 Mesh 成功';
            case EAction.Voxelise:
                return '像素化 Mesh 成功';
            case EAction.Palette:
                return '赋予方块 成功';
            case EAction.Export:
                return '导出 Mesh 成功';
            default:
                return '操作成功完成';
        }
    }

    public getDefaultFailureMessage(action: EAction): string {
        switch (action) {
            case EAction.Import:
                return '导入 Mesh 失败';
            case EAction.Simplify:
                return '简化 Mesh 失败';
            case EAction.Voxelise:
                return '像素化 Mesh 失败';
            case EAction.Palette:
                return '赋予方块 失败';
            case EAction.Export:
                return '导出 Mesh 失败';
            default:
                return '操作失败';
        }
    }
}
