from pathlib import Path
import re
s=Path('backend/src/main/java/com/escola/gestaoescolar/sige/Modules.java').read_text()
lines=['-- Preserve legacy tables. The SIGE schema uses its own namespace.','CREATE TABLE sige_config (id INT PRIMARY KEY, data JSON NOT NULL, revision BIGINT NOT NULL DEFAULT 0);', '''CREATE TABLE sige_users (
 id VARCHAR(80) PRIMARY KEY, username VARCHAR(80) NOT NULL UNIQUE,
 password_hash VARCHAR(100) NOT NULL, token_version BIGINT NOT NULL DEFAULT 0, data JSON NOT NULL
);''', '''CREATE TABLE sige_audit (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, created_at VARCHAR(40) NOT NULL,
 actor VARCHAR(80) NOT NULL, action VARCHAR(80) NOT NULL, detail TEXT NOT NULL
);''']
for match in re.finditer(r'm\("(\w+)","(\w+)"((?:,ref\("\w+","\w+"\))*)\)',s):
 name,key,refs=match.groups(); refs=re.findall(r'ref\("(\w+)","(\w+)"\)',refs)
 cols=[' id VARCHAR(80) PRIMARY KEY',' data JSON NOT NULL']
 for field,target in refs:
  cols += [f' {field.lower()} VARCHAR(80)',f' FOREIGN KEY ({field.lower()}) REFERENCES sige_{target.lower()}(id)']
 if name=='inscricoes': cols+=[' UNIQUE(codaluno,ano)']
 if name=='notas': cols+=[' UNIQUE(codinscricao,codmateria,ano)']
 if name=='atribuicoes': cols+=[' UNIQUE(codturma,idmateria,ano)']
 lines.append('CREATE TABLE sige_'+name.lower()+' (\n'+',\n'.join(cols)+'\n);')
Path('backend/src/main/resources/db/migration/V1__sige.sql').write_text('\n\n'.join(lines)+'\n')
