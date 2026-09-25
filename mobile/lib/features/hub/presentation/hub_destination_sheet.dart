import 'package:flutter/material.dart' hide Text;

import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/localized_text.dart';
import '../../../core/theme/app_theme.dart';
import '../../onboarding/data/onboarding_cities.dart';

Future<String?> showHubDestinationPicker(BuildContext context) =>
    showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => const _DestinationPicker(),
    );

class _DestinationPicker extends StatefulWidget {
  const _DestinationPicker();

  @override
  State<_DestinationPicker> createState() => _DestinationPickerState();
}

class _DestinationPickerState extends State<_DestinationPicker> {
  final _query = TextEditingController();

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  String _normalize(String value) => value
      .trim()
      .toLowerCase()
      .replaceAll('ı', 'i')
      .replaceAll('İ', 'i')
      .replaceAll('ş', 's')
      .replaceAll('ğ', 'g')
      .replaceAll('ü', 'u')
      .replaceAll('ö', 'o')
      .replaceAll('ç', 'c');

  @override
  Widget build(BuildContext context) {
    final english = context.l10n.isEnglish;
    final query = _normalize(_query.text);
    final matches = onboardingCities
        .where(
          (city) =>
              _normalize(city).contains(query) ||
              _normalize(englishOnboardingCity(city)).contains(query),
        )
        .toList();
    void choose(String city) => Navigator.pop(context, city);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: LayoutBuilder(
        builder: (context, constraints) => SizedBox(
          height: constraints.maxHeight * .85,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            child: CustomScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              slivers: [
                SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Nereye gidiyoruz?',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                          ),
                          IconButton(
                            tooltip: context.tr('Kapat'),
                            onPressed: () => Navigator.pop(context),
                            icon: const Icon(Icons.close_rounded),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        key: const ValueKey('hub-destination-query'),
                        controller: _query,
                        onChanged: (_) => setState(() {}),
                        textInputAction: TextInputAction.search,
                        onSubmitted: (value) {
                          if (value.trim().isNotEmpty) choose(value.trim());
                        },
                        decoration: InputDecoration(
                          hintText: context.tr('Şehir veya bölge ara...'),
                          prefixIcon: const Icon(Icons.search_rounded),
                          suffixIcon: _query.text.isEmpty
                              ? null
                              : IconButton(
                                  tooltip: context.tr('Temizle'),
                                  onPressed: () => setState(_query.clear),
                                  icon: const Icon(
                                    Icons.close_rounded,
                                    size: 20,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
                SliverList.separated(
                  itemCount: matches.length + (query.isEmpty ? 0 : 1),
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    if (index == matches.length) {
                      return ListTile(
                        key: const ValueKey('hub-custom-destination'),
                        contentPadding: EdgeInsets.zero,
                        leading: Icon(
                          Icons.add_location_alt_outlined,
                          color: context.colors.text,
                        ),
                        title: Text(_query.text.trim()),
                        subtitle: const Text('Bu destinasyonla devam et'),
                        onTap: () => choose(_query.text.trim()),
                      );
                    }
                    final city = english
                        ? englishOnboardingCity(matches[index])
                        : matches[index];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(
                        Icons.location_on_outlined,
                        color: context.colors.muted,
                      ),
                      title: Text(city),
                      trailing: const Icon(Icons.north_west_rounded, size: 18),
                      onTap: () => choose(city),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
