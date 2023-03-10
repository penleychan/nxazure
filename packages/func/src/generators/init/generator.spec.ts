import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { Tree, readProjectConfiguration } from '@nrwl/devkit';

import generator from './generator';
import { InitGeneratorSchema } from './schema';

jest.mock('@nrwl/devkit', () => {
  const originalModule = jest.requireActual('@nrwl/devkit');

  return {
    ...originalModule,
    installPackagesTask: jest.fn(() => console.log('Imagine installing packages here...')),
  };
});

describe('Check files', () => {
  const projectName = 'HelloWorld';
  let appTree: Tree;
  const options: InitGeneratorSchema = { name: projectName, strict: true, silent: true };

  beforeAll(async () => {
    appTree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    appTree.write('.eslintrc.json', JSON.stringify({}));
    await generator(appTree, options);
  });

  it('Folder name', () => {
    expect(appTree.exists('apps/hello-world')).toBeTruthy();
  });

  it('Project config', () => {
    const config = readProjectConfiguration(appTree, projectName);
    expect(config).toBeDefined();
    expect(config).toHaveProperty('name', projectName);
    expect(config).toHaveProperty('projectType', 'application');
    expect(config).toHaveProperty('targets.build.executor', '@nxazure/func:build');
    expect(config).toHaveProperty('targets.start.executor', '@nxazure/func:start');
    expect(config).toHaveProperty('targets.start.options.port', 7071);
    expect(config).toHaveProperty('targets.publish.executor', '@nxazure/func:publish');
  });

  it('VScode extension', () => {
    const vscodeSettings = appTree.read('.vscode/extensions.json');
    expect(vscodeSettings).toBeDefined();

    const vscodeSettingsObj = JSON.parse(vscodeSettings?.toString() || '{}');
    expect(vscodeSettingsObj.recommendations).toContain('ms-azuretools.vscode-azurefunctions');
  });

  it('Workspace package.json', () => {
    const packageJson = appTree.read('package.json');
    expect(packageJson).toBeDefined();

    const packageJsonObj = JSON.parse(packageJson?.toString() || '{}');
    expect(packageJsonObj).toHaveProperty('dependencies.tsconfig-paths');
    expect(packageJsonObj).toHaveProperty('devDependencies.typescript');
    expect(packageJsonObj).toHaveProperty('devDependencies.@azure/functions');
    expect(packageJsonObj).toHaveProperty('devDependencies.azure-functions-core-tools');
    expect(packageJsonObj).toHaveProperty('devDependencies.@types/node');
  });

  it('Workspace TS config file', () => {
    const tsconfig = appTree.read('apps/hello-world/tsconfig.json');
    expect(tsconfig).toBeDefined();

    const tsconfigObj = JSON.parse(tsconfig?.toString() || '{}');
    expect(tsconfigObj).toHaveProperty('extends', '../../tsconfig.base.json');
    expect(tsconfigObj).toHaveProperty('compilerOptions.module', 'commonjs');
    expect(tsconfigObj).toHaveProperty('compilerOptions.target', 'es6');
    expect(tsconfigObj).toHaveProperty('compilerOptions.sourceMap', true);
    expect(tsconfigObj).toHaveProperty('compilerOptions.strict', true);
  });

  it('Build TS config file', () => {
    const tsconfig = appTree.read('apps/hello-world/tsconfig.build.json');
    expect(tsconfig).toBeDefined();

    const tsconfigObj = JSON.parse(tsconfig?.toString() || '{}');
    expect(tsconfigObj).not.toHaveProperty('extends');
    expect(tsconfigObj).toHaveProperty('compilerOptions.outDir', 'dist');
    expect(tsconfigObj).toHaveProperty('compilerOptions.resolveJsonModule', true);
    expect(tsconfigObj).toHaveProperty('compilerOptions.module', 'commonjs');
    expect(tsconfigObj).toHaveProperty('compilerOptions.target', 'es6');
    expect(tsconfigObj).toHaveProperty('compilerOptions.sourceMap', true);
    expect(tsconfigObj).toHaveProperty('compilerOptions.strict', true);
  });

  it('Base TS config file', () => {
    const tsconfig = appTree.read('tsconfig.base.json');
    expect(tsconfig).toBeDefined();

    const tsconfigObj = JSON.parse(tsconfig?.toString() || '{}');
    expect(tsconfigObj).toHaveProperty('compilerOptions.resolveJsonModule', true);
  });

  it('Project eslint config file', () => {
    const eslintConfig = appTree.read('apps/hello-world/.eslintrc.json');
    expect(eslintConfig).toBeDefined();

    const eslintConfigObj = JSON.parse(eslintConfig?.toString() || '{}');
    expect(eslintConfigObj).toHaveProperty('extends', '../../.eslintrc.json');
    expect(eslintConfigObj.overrides[0]).toHaveProperty('parserOptions.project', ['apps/hello-world/tsconfig.*?.json']);
  });

  it('Auto generated files', () => {
    expect(appTree.exists('apps/hello-world/package.json')).toBeTruthy();
    expect(appTree.exists('apps/hello-world/host.json')).toBeTruthy();
    expect(appTree.exists('apps/hello-world/local.settings.json')).toBeTruthy();
    expect(appTree.exists('apps/hello-world/.funcignore')).toBeTruthy();
    expect(appTree.exists('apps/hello-world/_registerPaths.ts')).toBeTruthy();
  });
});

describe('Check strict option', () => {
  let appTree: Tree;
  const partialOptions: Omit<InitGeneratorSchema, 'strict'> = { name: 'HelloWorld', silent: true };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  it('Strict option is true', async () => {
    await generator(appTree, { ...partialOptions, strict: true });
    const workspaceTsConfig = appTree.read('apps/hello-world/tsconfig.json');
    const buildTsConfig = appTree.read('apps/hello-world/tsconfig.build.json');

    const workspaceTsConfigObj = JSON.parse(workspaceTsConfig?.toString() || '{}');
    const buildTsConfigObj = JSON.parse(buildTsConfig?.toString() || '{}');

    expect(workspaceTsConfigObj).toHaveProperty('compilerOptions.strict', true);
    expect(buildTsConfigObj).toHaveProperty('compilerOptions.strict', true);
  });

  it('Strict option is false', async () => {
    await generator(appTree, { ...partialOptions, strict: false });
    const workspaceTsConfig = appTree.read('apps/hello-world/tsconfig.json');
    const buildTsConfig = appTree.read('apps/hello-world/tsconfig.build.json');

    const workspaceTsConfigObj = JSON.parse(workspaceTsConfig?.toString() || '{}');
    const buildTsConfigObj = JSON.parse(buildTsConfig?.toString() || '{}');

    expect(workspaceTsConfigObj).toHaveProperty('compilerOptions.strict', false);
    expect(buildTsConfigObj).toHaveProperty('compilerOptions.strict', false);
  });
});

describe('Check port increased value', () => {
  let appTree: Tree;
  const baseOptions: InitGeneratorSchema = { name: 'HelloWorld', strict: true, silent: true };

  beforeAll(() => {
    appTree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  it('Port is 7071', async () => {
    const projectName = `${baseOptions.name}1`;

    await generator(appTree, { ...baseOptions, name: projectName });
    const config = readProjectConfiguration(appTree, projectName);

    expect(config).toHaveProperty('targets.start.options.port', 7071);
  });

  it('Port is 7072', async () => {
    const projectName = `${baseOptions.name}2`;

    await generator(appTree, { ...baseOptions, name: projectName });
    const config = readProjectConfiguration(appTree, projectName);

    expect(config).toHaveProperty('targets.start.options.port', 7072);
  });

  it('Port is 7073', async () => {
    const projectName = `${baseOptions.name}3`;

    await generator(appTree, { ...baseOptions, name: projectName });
    const config = readProjectConfiguration(appTree, projectName);

    expect(config).toHaveProperty('targets.start.options.port', 7073);
  });
});

describe('Init with no eslint', () => {
  const projectName = 'HelloWorld';
  let appTree: Tree;
  const baseOptions: InitGeneratorSchema = { name: projectName, strict: true, silent: true };

  beforeAll(async () => {
    appTree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  it('No global config -> no app config', async () => {
    await generator(appTree, { ...baseOptions, name: baseOptions.name + '1' });

    const eslintConfigExists = appTree.exists('apps/hello-world1/.eslintrc.json');
    expect(eslintConfigExists).toBeFalsy();
  });

  it('Global config exists -> app config generated', async () => {
    appTree.write('.eslintrc.json', JSON.stringify({}));
    await generator(appTree, { ...baseOptions, name: baseOptions.name + '2' });

    const eslintConfigExists = appTree.exists('apps/hello-world2/.eslintrc.json');
    expect(eslintConfigExists).toBeTruthy();
  });
});
