import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:smartsales365_mobile/controllers/auth_controller.dart';
import 'package:smartsales365_mobile/screens/login_screen.dart';
import 'package:smartsales365_mobile/services/auth_service.dart';
import 'package:smartsales365_mobile/services/token_storage.dart';

class _FakeAuthService extends AuthService {
  _FakeAuthService() : super();

  @override
  Future<AuthTokens> login({required String email, required String password}) async {
    return const AuthTokens(access: 'fake', refresh: 'fake');
  }
}

class _FakeTokenStorage extends TokenStorage {
  String? _access;
  String? _refresh;

  @override
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    _access = accessToken;
    _refresh = refreshToken;
  }

  @override
  Future<String?> getAccessToken() async => _access;

  @override
  Future<String?> getRefreshToken() async => _refresh;

  @override
  Future<void> clear() async {
    _access = null;
    _refresh = null;
  }
}

void main() {
  testWidgets('Login form renders email and password fields', (tester) async {
    final controller = AuthController(
      service: _FakeAuthService(),
      storage: _FakeTokenStorage(),
    );

    await tester.pumpWidget(
      ChangeNotifierProvider<AuthController>.value(
        value: controller,
        child: const MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Contrasena'), findsOneWidget);
    expect(find.text('Iniciar sesion'), findsOneWidget);
  });
}

