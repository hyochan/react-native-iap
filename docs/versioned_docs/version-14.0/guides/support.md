---
title: Support & Contributing
sidebar_label: Support
sidebar_position: 8
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Support & Contributing

<AdFitTopFixed />

We welcome contributions and are here to help you succeed with react-native-iap!

## Getting Help

### Documentation

- Check our comprehensive [documentation](/)
- Review the [FAQ](./faq) for common questions
- Browse [examples](../examples/basic-store) for implementation patterns

### Community Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/hyochan/react-native-iap/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/hyochan/react-native-iap/discussions)
- **Stack Overflow**: Tag your questions with `react-native-iap`

### Before Asking for Help

1. **Search existing issues** - Your question might already be answered
2. **Check the troubleshooting guide** - Many common issues are covered
3. **Provide a minimal reproduction** - This helps us help you faster
4. **Include relevant details** - Platform, versions, error messages, etc.

## Issue Reporting

When reporting a bug, please include:

### Environment Information

```
- react-native-iap version: x.x.x
- Platform: iOS/Android/Both
- OS version: iOS 16.1 / Android 13
- Device: iPhone 14 / Pixel 7
- Development environment: Expo Go / Development Build / Bare workflow
```

### Reproduction Steps

1. Clear steps to reproduce the issue
2. Expected behavior
3. Actual behavior
4. Minimal code example (if applicable)

### Logs and Screenshots

- Relevant error messages
- Console logs
- Screenshots (if UI-related)

## Contributing

We welcome contributions of all kinds! Here's how you can help:

### Ways to Contribute

1. **Bug Reports**: Help us identify and fix issues
2. **Feature Requests**: Suggest new features or improvements
3. **Documentation**: Improve docs, add examples, fix typos
4. **Code**: Submit bug fixes or new features
5. **Testing**: Test new releases and provide feedback
6. **Community**: Help others in discussions and issues

### Development Setup

1. **Fork the repository**

   ```bash
   git clone https://github.com/your-username/react-native-iap.git
   cd react-native-iap
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   bun install
   ```

3. **Run the example project**
   ```bash
   cd example
   npm install
   npx expo run:ios # or run:android
   ```

### Development Guidelines

#### Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Run linters before submitting: `npm run lint`
- Ensure all tests pass: `npm test`

#### Commit Messages

Use conventional commit format:

```
feat: add subscription management feature
fix: resolve Android billing client crash
docs: update installation guide
test: add unit tests for purchase flow
```

#### Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, maintainable code
   - Add tests for new features
   - Update documentation as needed

3. **Test your changes**

   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

4. **Submit a Pull Request**
   - Provide a clear description of changes
   - Link any related issues
   - Include screenshots for UI changes
   - Ensure CI passes

### Testing

#### Running Tests

```bash
# Unit tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint

# All checks
npm run validate
```

#### Test Coverage

- Write unit tests for new features
- Test on both iOS and Android
- Include edge cases and error scenarios
- Verify with real devices when possible

## Documentation Contributions

Documentation improvements are always welcome:

### Types of Documentation Contributions

- Fix typos and grammar
- Improve clarity and completeness
- Add missing examples
- Update outdated information
- Translate to other languages

### Documentation Setup

```bash
cd docs
npm install
npm start
```

This starts the documentation development server at `http://localhost:3000`.

### Writing Guidelines

- Use clear, concise language
- Include code examples
- Test all code snippets
- Follow the existing structure
- Consider different skill levels

## Community Guidelines

### Code of Conduct

We follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Please read it before participating.

### Be Respectful

- Be patient with newcomers
- Provide constructive feedback
- Avoid inflammatory language
- Help maintain a welcoming environment

### Best Practices

- Search before posting
- Use descriptive titles
- Stay on topic
- Follow up on your issues
- Thank contributors

## Recognition

Contributors are recognized in:

- GitHub contributors list
- Release notes (for significant contributions)
- Documentation credits
- Community highlights

## Project Roadmap

### Current Priorities

1. Enhanced error handling and debugging
2. Performance optimizations
3. Better TypeScript definitions
4. Improved testing coverage
5. Documentation improvements

### Future Plans

- Additional platform support
- Advanced analytics integration
- Enhanced subscription management
- Developer tools and debugging aids

## Sponsorship

If react-native-iap helps your business, consider sponsoring the project:

- [GitHub Sponsors](https://github.com/sponsors/hyochan)
- One-time donations
- Corporate sponsorship

Your support helps maintain and improve the project for everyone.

## Contact

### Maintainers

- **Primary Maintainer**: [@hyochan](https://github.com/hyochan)
- **Core Team**: See [contributors](https://github.com/hyochan/react-native-iap/graphs/contributors)

### Channels

- **GitHub**: Primary communication channel
- **Email**: For security issues or private matters
- **Social**: Follow updates on social media

## License

react-native-iap is licensed under the [MIT License](https://github.com/hyochan/react-native-iap/blob/main/LICENSE).

### Contributing License Agreement

By contributing, you agree that your contributions will be licensed under the same MIT License.

---

Thank you for using and contributing to react-native-iap! Together, we're building the best in-app purchase solution for the Expo and React Native ecosystem. 🚀
