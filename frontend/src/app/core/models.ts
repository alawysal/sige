export interface SigeRecord { [field: string]: any; }
export interface Session { IdUsuario: number; Usuario: string; Nome: string; Perfil: string; CodFuncionario: string; Ativo: string; }
export interface WorkspaceData {
 [module: string]: any;
 revision: number;
 config: SigeRecord;
 session: Session;
}
export interface Change { module: string; kind: 'upsert' | 'delete'; id: string; record?: SigeRecord; }
export interface MenuItem { k: string; l: string; i: string; g: string; }
export interface RendererBridge {
 data: WorkspaceData;
 commit(before: WorkspaceData, after: WorkspaceData): Promise<WorkspaceData>;
 renew(origin: string, destination: string): Promise<WorkspaceData>;
 restore(data: WorkspaceData): Promise<WorkspaceData>;
 reset(): Promise<WorkspaceData>;
 exportRenewals(year: string): Promise<string>;
 changed(data: WorkspaceData): void;
 navigate(view: string): void;
 busy(value: boolean): void;
 error(error: unknown): string;
}
export interface PromaxRenderer { show(view: string): void; destroy(): void; }
