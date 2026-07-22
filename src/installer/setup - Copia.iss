[Setup]
AppName=Enterprise
AppVersion=1.0.0
DefaultDirName=C:\Enterprise
DisableDirPage=yes
DefaultGroupName=Enterprise
OutputDir=output
OutputBaseFilename=Enterprise-setup
Compression=lzma
SolidCompression=yes
SetupIconFile=icon.ico
PrivilegesRequired=admin

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; Frontend (Next.js standalone build)
Source: "sysbin\node.exe"; DestDir: "{app}\sysbin"; Flags: ignoreversion
Source: "sysbin\*"; DestDir: "{app}\sysbin"; Flags: recursesubdirs createallsubdirs; Excludes: "node.exe"

; Backend
Source: "application\EnterpriseApi.exe"; DestDir: "{app}\application"
Source: "application\log.bat"; DestDir: "{app}\application"; Flags: ignoreversion

; Config (não sobrescreve)
Source: "application\params.ini"; DestDir: "{app}\application"; Flags: onlyifdoesntexist

; NSSM
Source: "nssm\nssm.exe"; DestDir: "{app}\nssm"

; Updater
Source: "update\updater.exe"; DestDir: "{app}\update"
Source: "update\service_updater.exe"; DestDir: "{app}\update"
Source: "update\atualizar_servico.bat"; DestDir: "{app}\update"

; Ícone
Source: "icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Run]
; Frontend installer (comentado - usar sysbin em vez disso)
; Filename: "{tmp}\Enterprise.exe"; Flags: waituntilterminated

; Instala o serviço
Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "install EnterpriseApi ""{app}\application\EnterpriseApi.exe"""; \
  Flags: runhidden

; Define diretório de trabalho
Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "set EnterpriseApi AppDirectory ""{app}\application"""; \
  Flags: runhidden

; Logs
Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "set EnterpriseApi AppStdout ""{app}\logs\out.log"""; \
  Flags: runhidden

Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "set EnterpriseApi AppStderr ""{app}\logs\err.log"""; \
  Flags: runhidden

; Start automático
Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "set EnterpriseApi Start SERVICE_AUTO_START"; \
  Flags: runhidden

; Inicia o serviço backend
Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "start EnterpriseApi"; \
  Flags: runhidden

; ========= Frontend Service (Enterprise) =========
Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "install Enterprise ""{app}\sysbin\node.exe"""; \
  Flags: runhidden

Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "set Enterprise Application ""{app}\sysbin\node.exe"""; \
  Flags: runhidden

Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "set Enterprise AppParameters ""server.js"""; \
  Flags: runhidden

Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "set Enterprise AppEnvironmentExtra ""PORT=3001"" ""HOSTNAME=127.0.0.1"""; \
  Flags: runhidden

Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "set Enterprise AppDirectory ""{app}\sysbin"""; \
  Flags: runhidden

Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "set Enterprise AppStdout ""{app}\sysbin\sysbin-out.log"""; \
  Flags: runhidden

Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "set Enterprise AppStderr ""{app}\sysbin\sysbin-err.log"""; \
  Flags: runhidden

Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "set Enterprise Start SERVICE_AUTO_START"; \
  Flags: runhidden

Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "start Enterprise"; \
  Flags: runhidden

[UninstallRun]
; Para o serviço backend
Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "stop EnterpriseApi"; \
  Flags: runhidden

; Remove o serviço backend
Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "remove EnterpriseApi confirm"; \
  Flags: runhidden

; Para o serviço frontend
Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "stop Enterprise"; \
  Flags: runhidden

; Remove o serviço frontend
Filename: "{app}\nssm\nssm.exe"; \
  Parameters: "remove Enterprise confirm"; \
  Flags: runhidden

; ==================================================
; ATALHO (CHROME EM MODO APP)
; ==================================================
[Icons]
Name: "{commondesktop}\Enterprise"; Filename: "C:\Program Files\Google\Chrome\Application\chrome.exe"; Parameters: "--app=http://127.0.0.1:3001/"; IconFilename: "{app}\icon.ico"

[Dirs]
Name: "{app}\application"
Name: "{app}\logs"
Name: "{app}\sysbin"
Name: "{app}\update"

[Code]
var
  ApiKeyPage: TInputQueryWizardPage;
  LastPostgresError: string;

function ChromeInstalled: Boolean;
var
  ChromePath: string;
begin
  ChromePath := ExpandConstant('{pf}\Google\Chrome\Application\chrome.exe');
  Result := FileExists(ChromePath);
end;

function GetChromePath(Param: string): string;
begin
  Result := ExpandConstant('{pf}\Google\Chrome\Application\chrome.exe');
end;

procedure InitializeWizard;
begin
  ApiKeyPage := CreateInputQueryPage(
    wpSelectDir,
    'Configuração da API',
    'Informe as credenciais de configuração',
    'Digite a chave da API e as credenciais do PostgreSQL para ativar o sistema.'
  );
  ApiKeyPage.Add('Chave da API:', False);
  ApiKeyPage.Add('Usuário PostgreSQL:', False);
  ApiKeyPage.Add('Senha PostgreSQL:', False);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = ApiKeyPage.ID then
  begin
    if Trim(ApiKeyPage.Values[0]) = '' then
    begin
      MsgBox('A chave da API é obrigatória.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if Trim(ApiKeyPage.Values[1]) = '' then
    begin
      MsgBox('O usuário do PostgreSQL é obrigatório.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if Trim(ApiKeyPage.Values[2]) = '' then
    begin
      MsgBox('A senha do PostgreSQL é obrigatória.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

procedure UpdateIniKey(const FileName, KeyName, KeyValue: string);
var
  Lines: TArrayOfString;
  i, KeyIndex: Integer;
begin
  if not LoadStringsFromFile(FileName, Lines) then Exit;

  KeyIndex := -1;

  for i := 0 to GetArrayLength(Lines) - 1 do
    if Pos(KeyName + '=', Lines[i]) = 1 then
    begin
      KeyIndex := i;
      Break;
    end;

  if KeyIndex <> -1 then
    Lines[KeyIndex] := KeyName + '=' + KeyValue
  else
  begin
    SetArrayLength(Lines, GetArrayLength(Lines) + 1);
    Lines[GetArrayLength(Lines) - 1] := KeyName + '=' + KeyValue;
  end;

  SaveStringsToFile(FileName, Lines, False);
end;

function FindPsqlInPath(): string;
var
  ResultCode: Integer;
  WhereFile: string;
  Lines: TArrayOfString;
  i: Integer;
begin
  Result := '';
  WhereFile := ExpandConstant('{tmp}\where_psql.txt');
  DeleteFile(WhereFile);

  if Exec('cmd.exe', '/c where psql.exe > ' + #34 + WhereFile + #34 + ' 2>nul', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if (ResultCode = 0) and LoadStringsFromFile(WhereFile, Lines) then
    begin
      for i := 0 to GetArrayLength(Lines) - 1 do
      begin
        if (Trim(Lines[i]) <> '') and FileExists(Trim(Lines[i])) then
        begin
          Result := Trim(Lines[i]);
          Break;
        end;
      end;
    end;
  end;

  DeleteFile(WhereFile);
end;

function ReadPostgresInstallBase(const SubKey: string; var OutBase: string): Boolean;
begin
  Result := RegQueryStringValue(HKLM, SubKey, 'Base Directory', OutBase);
  if not Result then
    Result := RegQueryStringValue(HKLM64, SubKey, 'Base Directory', OutBase);
end;

function FindPsqlInRegistry(): string;
var
  RegValue: string;
  InstallPath: string;
begin
  Result := '';
  
  if ReadPostgresInstallBase('SOFTWARE\PostgreSQL\Installations\postgresql-x64-17', RegValue) then
  begin
    InstallPath := RegValue + '\bin\psql.exe';
    if FileExists(InstallPath) then
    begin
      Result := InstallPath;
      Exit;
    end;
  end;
  
  if ReadPostgresInstallBase('SOFTWARE\PostgreSQL\Installations\postgresql-x64-16', RegValue) then
  begin
    InstallPath := RegValue + '\bin\psql.exe';
    if FileExists(InstallPath) then
    begin
      Result := InstallPath;
      Exit;
    end;
  end;
  
  if ReadPostgresInstallBase('SOFTWARE\PostgreSQL\Installations\postgresql-x64-15', RegValue) then
  begin
    InstallPath := RegValue + '\bin\psql.exe';
    if FileExists(InstallPath) then
    begin
      Result := InstallPath;
      Exit;
    end;
  end;
  
  if ReadPostgresInstallBase('SOFTWARE\PostgreSQL\Installations\postgresql-x64-14', RegValue) then
  begin
    InstallPath := RegValue + '\bin\psql.exe';
    if FileExists(InstallPath) then
    begin
      Result := InstallPath;
      Exit;
    end;
  end;
  
  if ReadPostgresInstallBase('SOFTWARE\PostgreSQL\Installations\postgresql-x64-13', RegValue) then
  begin
    InstallPath := RegValue + '\bin\psql.exe';
    if FileExists(InstallPath) then
    begin
      Result := InstallPath;
      Exit;
    end;
  end;
  
  if ReadPostgresInstallBase('SOFTWARE\PostgreSQL\Installations\postgresql-x64-12', RegValue) then
  begin
    InstallPath := RegValue + '\bin\psql.exe';
    if FileExists(InstallPath) then
    begin
      Result := InstallPath;
      Exit;
    end;
  end;

  if ReadPostgresInstallBase('SOFTWARE\PostgreSQL\Installations\postgresql-x64-11', RegValue) then
  begin
    InstallPath := RegValue + '\bin\psql.exe';
    if FileExists(InstallPath) then
    begin
      Result := InstallPath;
      Exit;
    end;
  end;

  if ReadPostgresInstallBase('SOFTWARE\PostgreSQL\Installations\postgresql-x64-10', RegValue) then
  begin
    InstallPath := RegValue + '\bin\psql.exe';
    if FileExists(InstallPath) then
    begin
      Result := InstallPath;
      Exit;
    end;
  end;

  if ReadPostgresInstallBase('SOFTWARE\PostgreSQL\Installations\postgresql-x64-9.6', RegValue) then
  begin
    InstallPath := RegValue + '\bin\psql.exe';
    if FileExists(InstallPath) then
    begin
      Result := InstallPath;
      Exit;
    end;
  end;

  if ReadPostgresInstallBase('SOFTWARE\PostgreSQL\Installations\postgresql-x64-9.5', RegValue) then
  begin
    InstallPath := RegValue + '\bin\psql.exe';
    if FileExists(InstallPath) then
    begin
      Result := InstallPath;
      Exit;
    end;
  end;

  if ReadPostgresInstallBase('SOFTWARE\PostgreSQL\Installations\postgresql-x64-18', RegValue) then
  begin
    InstallPath := RegValue + '\bin\psql.exe';
    if FileExists(InstallPath) then
    begin
      Result := InstallPath;
      Exit;
    end;
  end;
end;

function CreatePostgresDatabase(const PgUser, PgPassword: string): Boolean;
var
  ResultCode: Integer;
  i: Integer;
  PsqlExe: string;
  CmdSafePassword: string;
  CheckCmd: string;
  CreateCmd: string;
  CheckFile: string;
  CheckErrFile: string;
  CheckLines: TArrayOfString;
  ErrLines: TArrayOfString;
begin
  LastPostgresError := '';

  PsqlExe := ExpandConstant('{pf64}\PostgreSQL\18\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf64}\PostgreSQL\17\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf64}\PostgreSQL\16\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf64}\PostgreSQL\15\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf64}\PostgreSQL\14\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf64}\PostgreSQL\13\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf64}\PostgreSQL\12\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf64}\PostgreSQL\11\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf64}\PostgreSQL\10\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf64}\PostgreSQL\9.6\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf64}\PostgreSQL\9.5\bin\psql.exe');

  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf}\PostgreSQL\18\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf}\PostgreSQL\17\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf}\PostgreSQL\16\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf}\PostgreSQL\15\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf}\PostgreSQL\14\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf}\PostgreSQL\13\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf}\PostgreSQL\12\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf}\PostgreSQL\11\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf}\PostgreSQL\10\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf}\PostgreSQL\9.6\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf}\PostgreSQL\9.5\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf32}\PostgreSQL\18\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf32}\PostgreSQL\17\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf32}\PostgreSQL\16\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf32}\PostgreSQL\15\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf32}\PostgreSQL\14\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf32}\PostgreSQL\13\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf32}\PostgreSQL\12\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf32}\PostgreSQL\11\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf32}\PostgreSQL\10\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf32}\PostgreSQL\9.6\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf32}\PostgreSQL\9.5\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf64}\PostgreSQL\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf}\PostgreSQL\bin\psql.exe');
  if not FileExists(PsqlExe) then PsqlExe := ExpandConstant('{pf32}\PostgreSQL\bin\psql.exe');
  
  if not FileExists(PsqlExe) then
  begin
    PsqlExe := FindPsqlInRegistry();
  end;
  
  if not FileExists(PsqlExe) then
  begin
    PsqlExe := FindPsqlInPath();
  end;

  if not FileExists(PsqlExe) then
  begin
    LastPostgresError := 'psql.exe não foi encontrado. Instale PostgreSQL ou adicione à variável PATH.';
    Result := False;
    Exit;
  end;

  CmdSafePassword := PgPassword;
  StringChangeEx(CmdSafePassword, '%', '%%', True);
  StringChangeEx(CmdSafePassword, '"', '""', True);

  CheckFile := ExpandConstant('{tmp}\enterprise_db_check.txt');
  CheckErrFile := ExpandConstant('{tmp}\enterprise_db_check_err.txt');
  DeleteFile(CheckFile);
  DeleteFile(CheckErrFile);

  CheckCmd := '/c set ' + #34 + 'PGPASSWORD=' + CmdSafePassword + #34 + ' && ';
  CheckCmd := CheckCmd + #34 + PsqlExe + #34 + ' -h 127.0.0.1 -p 5432 ';
  CheckCmd := CheckCmd + '-U ' + #34 + PgUser + #34 + ' -d enterprise_db -tAc ';
  CheckCmd := CheckCmd + #34 + 'SELECT 1;' + #34;
  CheckCmd := CheckCmd + ' > ' + #34 + CheckFile + #34 + ' 2> ' + #34 + CheckErrFile + #34;

  if not Exec('cmd.exe', CheckCmd, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    LastPostgresError := 'Falha ao executar comando de verificação via cmd.exe.';
    Result := False;
    Exit;
  end;

  if (ResultCode = 0) and LoadStringsFromFile(CheckFile, CheckLines) then
  begin
    for i := 0 to GetArrayLength(CheckLines) - 1 do
      if Pos('1', Trim(CheckLines[i])) > 0 then
      begin
        Result := True;
        Exit;
      end;
  end;

  CreateCmd := '/c set ' + #34 + 'PGPASSWORD=' + CmdSafePassword + #34 + ' && ';
  CreateCmd := CreateCmd + #34 + PsqlExe + #34 + ' -h 127.0.0.1 -p 5432 ';
  CreateCmd := CreateCmd + '-U ' + #34 + PgUser + #34 + ' -d postgres -c ';
  CreateCmd := CreateCmd + #34 + 'CREATE DATABASE enterprise_db' + #34;
  CreateCmd := CreateCmd + ' > ' + #34 + CheckFile + #34 + ' 2> ' + #34 + CheckErrFile + #34;

  if Exec('cmd.exe', CreateCmd, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0) then
  begin
    Result := True;
    Exit;
  end;

  DeleteFile(CheckFile);
  DeleteFile(CheckErrFile);

  CheckCmd := '/c set ' + #34 + 'PGPASSWORD=' + CmdSafePassword + #34 + ' && ';
  CheckCmd := CheckCmd + #34 + PsqlExe + #34 + ' -h 127.0.0.1 -p 5432 ';
  CheckCmd := CheckCmd + '-U ' + #34 + PgUser + #34 + ' -d enterprise_db -tAc ';
  CheckCmd := CheckCmd + #34 + 'SELECT 1;' + #34;
  CheckCmd := CheckCmd + ' > ' + #34 + CheckFile + #34 + ' 2> ' + #34 + CheckErrFile + #34;

  if Exec('cmd.exe', CheckCmd, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and
     (ResultCode = 0) then
  begin
    if LoadStringsFromFile(CheckFile, CheckLines) then
      for i := 0 to GetArrayLength(CheckLines) - 1 do
        if Pos('1', Trim(CheckLines[i])) > 0 then
        begin
          Result := True;
          Exit;
        end;
  end;

  if LoadStringsFromFile(CheckErrFile, ErrLines) then
    for i := 0 to GetArrayLength(ErrLines) - 1 do
      if Trim(ErrLines[i]) <> '' then
      begin
        Log('PostgreSQL stderr: ' + ErrLines[i]);
        if LastPostgresError = '' then
          LastPostgresError := Trim(ErrLines[i]);
      end;

  if (LastPostgresError = '') and (ResultCode <> 0) then
    LastPostgresError := 'Comando psql retornou código ' + IntToStr(ResultCode) + '.';

  if (LastPostgresError = '') and (PsqlExe = 'psql') then
    LastPostgresError := 'psql não foi encontrado no PATH.';

  Result := False;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  IniPath: string;
begin
  if CurStep = ssPostInstall then
  begin
    IniPath := ExpandConstant('{app}\application\params.ini');
    UpdateIniKey(IniPath, 'apiKey', ApiKeyPage.Values[0]);
    UpdateIniKey(IniPath, 'pgUser', ApiKeyPage.Values[1]);
    UpdateIniKey(IniPath, 'pgPassword', ApiKeyPage.Values[2]);

    if not CreatePostgresDatabase(ApiKeyPage.Values[1], ApiKeyPage.Values[2]) then
    begin
      MsgBox('Não foi possível criar/acessar o banco enterprise_db.' + #13#10 +
             'Detalhe: ' + LastPostgresError + #13#10 +
             'Verifique serviço PostgreSQL, usuário/senha, permissões e psql.', mbCriticalError, MB_OK);
      Abort;
    end;
  end;
end;
