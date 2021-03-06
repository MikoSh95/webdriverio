import TestingBotService from '../src/service'
import got from 'got'

const uri = '/some/uri'
const featureObject = {
    type: 'gherkin-document',
    uri: '__tests__/features/passed.feature',
    document:
        {
            type: 'GherkinDocument',
            feature:
                {
                    type: 'Feature',
                    tags: ['tag'],
                    location: ['Object'],
                    language: 'en',
                    keyword: 'Feature',
                    name: 'Create a feature',
                    description: '    the description',
                    children: [''],
                },
            comments: []
        }
} as any

(got.put as jest.Mock).mockReturnValue(Promise.resolve({ body: '{}' }))

describe('wdio-testingbot-service', () => {
    const execute = jest.fn()

    let browser: WebdriverIO.BrowserObject | WebdriverIO.MultiRemoteBrowserObject
    beforeEach(() => {
        browser = {
            execute,
            sessionId: 'globalSessionId',
            requestHandler: {
                auth: {
                    user: 'user',
                    pass: 'pass'
                }
            },
            config: {},
            chromeA: { sessionId: 'sessionChromeA' },
            chromeB: { sessionId: 'sessionChromeB' },
            chromeC: { sessionId: 'sessionChromeC' },
            instances: ['chromeA', 'chromeB', 'chromeC'],
        } as any
    })

    afterEach(() => {
        execute.mockReset();
        (got.put as jest.Mock).mockClear()
    })

    it('before', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const capabilities: WebDriver.DesiredCapabilities = {
            name: 'Test suite',
            tags: ['tag1', 'tag2'],
            public: true,
            build: 344
        } as any
        tbService.beforeSession({
            user: 'foobar',
            key: 'fookey'
        }, capabilities)

        expect(tbService['_capabilities']).toEqual(capabilities)
        expect(tbService['_tbUser']).toEqual('foobar')
        expect(tbService['_tbSecret']).toEqual('fookey')
        expect(tbService['_testCnt']).toEqual(0)
        expect(tbService['_failures']).toEqual(0)
    })

    it('beforeSuite', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const suiteTitle = 'Test Suite Title'
        tbService.beforeSuite({ title: suiteTitle } as WebdriverIO.Suite)

        expect(tbService['_suiteTitle']).toEqual(suiteTitle)
    })

    it('beforeTest: execute not called', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const test = {
            fullName: 'Test #1',
            parent: 'Test parent'
        } as WebdriverIO.Test
        tbService['_tbUser'] = undefined
        tbService['_tbSecret'] = undefined
        tbService['_suiteTitle'] = 'Test suite'
        tbService.beforeTest(test)

        expect(execute).not.toBeCalled()
        expect(tbService['_suiteTitle']).toEqual('Test suite')
    })

    it('beforeTest: execute called', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const test: WebdriverIO.Test = {
            name: 'Test name',
            fullName: 'Test #1',
            title: 'Test title',
            parent: 'Test parent'
        } as any
        tbService.beforeSession({
            user: 'user',
            key: 'secret'
        }, {})
        tbService.beforeSuite({ title: 'Test suite' } as WebdriverIO.Suite)
        tbService.beforeTest(test)

        expect(execute).toBeCalledWith('tb:test-context=Test #1')
        expect(tbService['_suiteTitle']).toEqual('Test suite')
    })

    it('beforeTest: execute called for Jasmine tests', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const test: WebdriverIO.Test = {
            name: 'Test name',
            fullName: 'Test #1',
            title: 'Test title',
            parent: 'Test parent'
        } as any
        tbService.beforeSession({
            user: 'user',
            key: 'secret'
        }, {})

        tbService.beforeSuite({ title: 'Jasmine__TopLevel__Suite' } as WebdriverIO.Suite)
        tbService.beforeTest(test)

        expect(execute).toBeCalledWith('tb:test-context=Test #1')
        expect(tbService['_suiteTitle']).toEqual('Test ')
    })

    it('beforeTest: execute called for Mocha test', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const test: WebdriverIO.Test = {
            name: 'Test name',
            title: 'Test title',
            parent: 'Test parent'
        } as any
        tbService.beforeSession({
            user: 'user',
            key: 'secret'
        }, {})

        tbService.beforeSuite({} as WebdriverIO.Suite)
        tbService.beforeTest(test)

        expect(execute).toBeCalledWith('tb:test-context=Test parent - Test title')
    })

    it('afterTest: failed test', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        tbService['_failures'] = 0
        const testResult = {
            passed: true
        } as WebdriverIO.TestResult
        tbService.afterTest({} as WebdriverIO.Test, {}, testResult)

        expect(tbService['_failures']).toEqual(0)
    })

    it('afterTest: passed test', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        tbService['_failures'] = 0
        const testResult = {
            passed: false
        } as WebdriverIO.TestResult
        tbService.afterTest({} as WebdriverIO.Test, {}, testResult)

        expect(tbService['_failures']).toEqual(1)
    })

    it('beforeFeature: execute not called', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        tbService.beforeFeature(uri, featureObject)

        expect(execute).not.toBeCalled()
    })

    it('beforeFeature: execute called', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        tbService.beforeSession({
            user: 'user',
            key: 'secret'
        }, {})
        tbService.beforeFeature(uri, featureObject)

        expect(tbService['_suiteTitle']).toEqual('Create a feature')
        expect(execute).toBeCalledWith('tb:test-context=Feature: Create a feature')
    })

    it('afterScenario: exception happened', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        tbService['_failures'] = 0

        expect(tbService['_failures']).toBe(0)

        tbService.afterScenario(uri, {}, {}, { status: 'passed' })
        expect(tbService['_failures']).toBe(0)

        tbService.afterScenario(uri, {}, {}, { status: 'failed' })
        expect(tbService['_failures']).toBe(1)

        tbService.afterScenario(uri, {}, {}, { status: 'passed' })
        expect(tbService['_failures']).toBe(1)

        tbService.afterScenario(uri, {}, {}, { status: 'failed' })
        expect(tbService['_failures']).toBe(2)
    })

    it('beforeScenario: execute not called', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const scenario = { name: 'Scenario name' }
        tbService.beforeSession({
            user: 'user',
            key: undefined
        }, {})
        tbService.beforeScenario(uri, featureObject, scenario)

        expect(execute).not.toBeCalled()
    })

    it('beforeScenario: execute called', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const scenario = { name: 'Scenario name' }
        tbService.beforeSession({
            user: 'user',
            key: 'secret'
        }, {})
        tbService.beforeScenario(uri, featureObject, scenario)

        expect(execute).toBeCalledWith('tb:test-context=Scenario: Scenario name')
    })

    it('after: updatedJob not called', async () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const updateJobSpy = jest.spyOn(tbService, 'updateJob')
        tbService.beforeSession({
            user: undefined,
            key: undefined
        }, {})
        await tbService.after()

        expect(updateJobSpy).not.toBeCalled()
    })

    it('after: updatedJob called with passed params', async () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const updateJobSpy = jest.spyOn(tbService, 'updateJob')

        tbService['_browser'].config = { mochaOpts: { bail: true } }
        tbService['_browser'].sessionId = 'sessionId'

        tbService.beforeSession({
            user: 'user',
            key: 'secret'
        }, {})

        tbService['_failures'] = 2
        await tbService.after()

        expect(updateJobSpy).toBeCalledWith('sessionId', 2)
    })

    it('after: updatedJob called when bailed', async () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const updateJobSpy = jest.spyOn(tbService, 'updateJob')

        tbService['_browser'].config = { mochaOpts: { bail: true } }
        tbService['_browser'].sessionId = 'sessionId'

        tbService.beforeSession({
            user: 'user',
            key: 'secret'
        }, {})

        await tbService.after(10)

        expect(updateJobSpy).toBeCalledWith('sessionId', 1)
    })

    it('after: updatedJob called when status passed', async () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const updateJobSpy = jest.spyOn(tbService, 'updateJob')

        tbService['_browser'].config = { mochaOpts: { bail: true } }
        tbService['_browser'].sessionId = 'sessionId'

        tbService.beforeSession({
            user: 'user',
            key: 'secret'
        }, {})

        tbService['_failures'] = 0
        await tbService.after()

        expect(updateJobSpy).toBeCalledWith('sessionId', 0)
    })

    it('after: with multi-remote: updatedJob called with passed params', async () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const updateJobSpy = jest.spyOn(tbService, 'updateJob')
        tbService.beforeSession({
            user: 'user',
            key: 'secret'
        }, { chromeA: {}, chromeB: {}, chromeC: {} } as any)

        tbService['_browser'].isMultiremote = true
        tbService['_browser'].sessionId = 'sessionId'
        tbService['_failures'] = 2
        await tbService.after()

        expect(updateJobSpy).toBeCalledWith('sessionChromeA', 2, false, 'chromeA')
        expect(updateJobSpy).toBeCalledWith('sessionChromeB', 2, false, 'chromeB')
        expect(updateJobSpy).toBeCalledWith('sessionChromeC', 2, false, 'chromeC')
    })

    it('onReload: updatedJob not called', async () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const tbService2 = new TestingBotService()
        tbService2['_browser'] = browser
        const updateJobSpy = jest.spyOn(tbService2, 'updateJob')
        tbService.beforeSession({
            user: undefined,
            key: undefined
        }, {})

        tbService['_browser'].sessionId = 'sessionId'
        await tbService.onReload('oldSessionId', 'newSessionId')

        expect(updateJobSpy).not.toBeCalled()
    })

    it('onReload: updatedJob called with passed params', async () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const updateJobSpy = jest.spyOn(tbService, 'updateJob')
        tbService.beforeSession({
            user: 'user',
            key: 'secret'
        }, {})

        tbService['_browser'].sessionId = 'sessionId'
        tbService['_failures'] = 2
        await tbService.onReload('oldSessionId', 'newSessionId')

        expect(updateJobSpy).toBeCalledWith('oldSessionId', 2, true)
        expect(got.put).toHaveBeenCalled()
    })

    it('onReload with multi-remote: updatedJob called with passed params', async () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        const updateJobSpy = jest.spyOn(tbService, 'updateJob')
        tbService.beforeSession({
            user: 'user',
            key: 'secret'
        }, {})

        tbService['_browser'].isMultiremote = true
        tbService['_browser'].sessionId = 'sessionId'
        tbService['_failures'] = 2
        await tbService.onReload('oldSessionId', 'sessionChromeA')

        expect(updateJobSpy).toBeCalledWith('oldSessionId', 2, true, 'chromeA')
        expect(got.put).toHaveBeenCalled()
    })

    it('getRestUrl', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        expect(tbService.getRestUrl('testSessionId'))
            .toEqual('https://api.testingbot.com/v1/tests/testSessionId')
    })

    it('getBody', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        tbService.beforeSession({}, {
            name: 'Test suite',
            tags: ['tag1', 'tag2'],
            public: true,
            build: 344
        })

        tbService.beforeSuite({ title: 'Suite title' } as WebdriverIO.Suite)

        expect(tbService.getBody(0, false)).toEqual({
            test: {
                build: 344,
                name: 'Test suite',
                public: true,
                success: '1',
                tags: ['tag1', 'tag2']
            }
        })

        tbService['_testCnt'] = 2
        expect(tbService.getBody(2, true)).toEqual({
            test: {
                build: 344,
                name: 'Test suite',
                public: true,
                success: '0',
                tags: ['tag1', 'tag2']
            }
        })
    })

    it('getBody should contain browserName if passed', () => {
        const tbService = new TestingBotService()
        tbService['_browser'] = browser
        tbService.beforeSession({}, {
            name: 'Test suite',
            tags: ['tag3', 'tag4'],
            public: true,
            build: 344
        })

        expect(tbService.getBody(0, false, 'internet explorer')).toEqual({
            test: {
                build: 344,
                name: 'internet explorer: Test suite',
                public: true,
                success: '1',
                tags: ['tag3', 'tag4']
            }
        })
    })

    it('updateJob success', async () => {
        const service = new TestingBotService()
        service['_browser'] = browser
        service.beforeSession({ user: 'foobar', key: '123' }, {})
        service['_suiteTitle'] = 'my test'

        await service.updateJob('12345', 23, true)

        expect(service['_failures']).toBe(0)
        expect(got.put).toHaveBeenCalled()
        expect((got.put as jest.Mock).mock.calls[0][1].username).toBe('foobar')
        expect((got.put as jest.Mock).mock.calls[0][1].password).toBe('123')
    })

    it('updateJob failure', async () => {
        const response: any = new Error('Failure')
        response.statusCode = 500;
        (got.put as jest.Mock).mockReturnValue(Promise.reject(response))

        const service = new TestingBotService()
        service['_browser'] = browser
        service.beforeSession({ user: 'foobar', key: '123' }, {})
        service['_suiteTitle'] = 'my test'
        const err: any = await service.updateJob('12345', 23, true).catch((err) => err)
        expect(err.message).toBe('Failure')

        expect(got.put).toHaveBeenCalled()
        expect(service['_failures']).toBe(0)
    })

    it('afterSuite', () => {
        const service = new TestingBotService()
        service['_browser'] = browser
        expect(service['_failures']).toBe(0)
        service.afterSuite({} as WebdriverIO.Suite)
        expect(service['_failures']).toBe(0)
        service.afterSuite({ error: new Error('boom!') } as WebdriverIO.Suite)
        expect(service['_failures']).toBe(1)
    })
})
