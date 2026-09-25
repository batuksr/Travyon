import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_theme.dart';

/// The center destination starts a flow without replacing the selected tab.
class HubNavigationBar extends StatelessWidget {
  const HubNavigationBar({
    super.key,
    required this.selectedTab,
    required this.onSelect,
    required this.onCreate,
  });

  final int selectedTab;
  final ValueChanged<int> onSelect;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return SafeArea(
      top: false,
      minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colors.surface,
          borderRadius: BorderRadius.circular(40),
          border: Border.all(color: colors.divider),
          boxShadow: [
            BoxShadow(
              color: colors.text.withValues(alpha: .07),
              blurRadius: 20,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(40),
          child: NavigationBarTheme(
            data: NavigationBarThemeData(
              height: 70,
              backgroundColor: Colors.transparent,
              surfaceTintColor: Colors.transparent,
              indicatorColor: Colors.transparent,
              iconTheme: WidgetStateProperty.resolveWith(
                (states) => IconThemeData(
                  size: 21,
                  color: states.contains(WidgetState.selected)
                      ? colors.accent
                      : colors.muted,
                ),
              ),
            ),
            child: NavigationBar(
              labelBehavior: NavigationDestinationLabelBehavior.alwaysHide,
              selectedIndex: selectedTab < 2 ? selectedTab : selectedTab + 1,
              onDestinationSelected: (index) {
                if (index == 2) {
                  onCreate();
                } else {
                  onSelect(index < 2 ? index : index - 1);
                }
              },
              destinations: [
                NavigationDestination(
                  key: const ValueKey('nav-home'),
                  icon: const Icon(Icons.home_outlined),
                  selectedIcon: const Icon(Icons.home_rounded),
                  label: context.tr('Ana Sayfa'),
                ),
                NavigationDestination(
                  key: const ValueKey('nav-plans'),
                  icon: const Icon(Icons.map_outlined),
                  selectedIcon: const Icon(Icons.map_rounded),
                  label: context.tr('Planlar'),
                ),
                NavigationDestination(
                  key: const ValueKey('nav-create-plan'),
                  label: '',
                  tooltip: context.tr('Yeni plan oluştur'),
                  icon: Semantics(
                    label: context.tr('Yeni plan oluştur'),
                    child: ExcludeSemantics(
                      child: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: colors.accent,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: colors.accent.withValues(alpha: .2),
                              blurRadius: 10,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Icon(
                          Icons.add_rounded,
                          size: 27,
                          color: colors.onAccent,
                        ),
                      ),
                    ),
                  ),
                ),
                NavigationDestination(
                  key: const ValueKey('nav-wallet'),
                  icon: const Icon(Icons.account_balance_wallet_outlined),
                  selectedIcon: const Icon(
                    Icons.account_balance_wallet_rounded,
                  ),
                  label: context.tr('Cüzdan'),
                ),
                NavigationDestination(
                  key: const ValueKey('nav-community'),
                  icon: const Icon(Icons.people_outline_rounded),
                  selectedIcon: const Icon(Icons.people_rounded),
                  label: context.tr('Topluluk'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
