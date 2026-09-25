import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/localized_text.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/travyon_ui.dart';

class SettingsProfileHeader extends StatelessWidget {
  const SettingsProfileHeader({
    super.key,
    required this.name,
    required this.email,
    required this.onPhoto,
    this.photoUrl,
    this.busy = false,
  });

  final String name, email;
  final String? photoUrl;
  final VoidCallback onPhoto;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final displayName = name.trim().isEmpty
        ? context.tr('Gezgin')
        : name.trim();
    final words = displayName.split(RegExp(r'\s+'));
    final initials =
        '${words.first.characters.first}${words.length > 1 ? words.last.characters.first : ''}'
            .toUpperCase();
    final uri = Uri.tryParse(photoUrl ?? '');
    final validPhoto =
        uri != null &&
        uri.host.isNotEmpty &&
        uri.userInfo.isEmpty &&
        (uri.scheme == 'https' ||
            (uri.scheme == 'http' && uri.host == '10.0.2.2'));
    final fallback = ColoredBox(
      color: context.colors.accent,
      child: Center(
        child: Text(
          initials,
          style: TextStyle(
            color: context.colors.onAccent,
            fontSize: 25,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
      child: Column(
        children: [
          SizedBox(
            width: 112,
            height: 100,
            child: Stack(
              children: [
                Align(
                  alignment: Alignment.topCenter,
                  child: ExcludeSemantics(
                    child: ClipOval(
                      child: SizedBox(
                        width: 84,
                        height: 84,
                        child: !validPhoto
                            ? fallback
                            : Image.network(
                                photoUrl!,
                                fit: BoxFit.cover,
                                cacheWidth: 252,
                                frameBuilder: (_, child, frame, synchronous) =>
                                    synchronous || frame != null
                                    ? child
                                    : fallback,
                                errorBuilder: (_, _, _) => fallback,
                              ),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: IconButton.filled(
                    key: const ValueKey('settings-change-photo'),
                    tooltip: context.tr(
                      busy ? 'İşleniyor…' : 'Fotoğrafı değiştir',
                    ),
                    onPressed: busy ? null : onPhoto,
                    style: IconButton.styleFrom(
                      minimumSize: const Size(44, 44),
                      backgroundColor: context.colors.surface,
                      foregroundColor: context.colors.text,
                      side: BorderSide(color: context.colors.divider),
                    ),
                    icon: const Icon(Icons.edit_outlined, size: 18),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            displayName,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleLarge
                ?.copyWith(fontSize: 20, fontWeight: FontWeight.w700),
          ),
          if (email.trim().isNotEmpty) ...[
            const SizedBox(height: 5),
            Text(
              email.trim(),
              textAlign: TextAlign.center,
              style: TextStyle(
                color: context.colors.muted,
                fontSize: 13,
                height: 1.5,
              ),
            ),
          ],
          const SizedBox(height: 8),
          Text(
            'JPEG · En fazla 512 KB',
            textAlign: TextAlign.center,
            style: TextStyle(color: context.colors.muted, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class SettingsMenuTile extends StatelessWidget {
  const SettingsMenuTile({
    super.key,
    required this.title,
    required this.icon,
    required this.onTap,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => TravyonSurface(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
    borderRadius: 16,
    onTap: onTap,
    child: Row(
      children: [
        TravyonIconBadge(
          icon: icon,
          size: 36,
          color: context.colors.text,
          background: context.colors.orangeTint,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: context.colors.text,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  height: 1.4,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Text(
                  subtitle!,
                  style: TextStyle(
                    color: context.colors.muted,
                    fontSize: 12,
                    height: 1.45,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(width: 8),
        Icon(
          Icons.chevron_right_rounded,
          size: 18,
          color: context.colors.muted,
        ),
      ],
    ),
  );
}

class SettingsMenuGroup extends StatelessWidget {
  const SettingsMenuGroup({
    super.key,
    required this.title,
    required this.children,
  });
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 8, 4, 12),
          child: Semantics(
            header: true,
            child: Text(
              title,
              style: TextStyle(
                color: context.colors.muted,
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: .7,
                height: 1.5,
              ),
            ),
          ),
        ),
        ...children,
      ],
    ),
  );
}
