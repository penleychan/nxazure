import { readJsonFile } from '@nx/devkit';
import fs from 'fs';
import { glob } from 'glob';
import path from 'path';
import { ModuleKind } from 'typescript';
import { isV4, registrationFileName } from '../../common';

const getFilesForPathInjection = async (appRoot: string) => {
  if (isV4()) {
    const { main: functionsPathPattern } = readJsonFile<{ main: string }>(path.join(appRoot, 'package.json'));

    const functionsPath = path.posix.join(appRoot, functionsPathPattern);
    const functions = await glob(functionsPath);

    return functions;
  } else {
    const functionJsonFiles = await glob('**/function.json', { cwd: appRoot, ignore: ['**/node_modules/**'] });

    return await Promise.all(
      functionJsonFiles
        .map(file => path.join(appRoot, file))
        .map(async file => {
          const { scriptFile } = await readJsonFile<{ scriptFile: string }>(file);
          return path.join(path.dirname(file), scriptFile);
        }),
    );
  }
};

export const injectPathRegistration = async (outputPath: string, appRoot: string, moduleKind: ModuleKind | string) => {
  const registerPathsFilePath = path.join(outputPath, appRoot, `${registrationFileName}.js`);
  const filesToInject = await getFilesForPathInjection(appRoot);

  await Promise.all(
    filesToInject.map(async filePath => {
      const relativePath = path.relative(path.dirname(filePath), registerPathsFilePath).replace(/\\/g, '/');

      const content = await fs.promises.readFile(filePath, 'utf-8');
      const newJsFileContent =
        moduleKind === ModuleKind.CommonJS ? `require('${relativePath}');\n${content}` : `import '${relativePath}';\n${content}`;
      await fs.promises.writeFile(filePath, newJsFileContent);
    }),
  );
};
